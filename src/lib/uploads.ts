import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_DIMENSION = 1600;
export const WEBP_QUALITY = 82;
// Tope de píxeles de entrada: ~16 MP (DSLR rango medio). Por encima asumimos
// "decompression bomb" y rechazamos antes de gastar RAM en la decodificación.
export const MAX_INPUT_PIXELS = 16 * 1024 * 1024;

export type UploadKind = "items" | "avatars";

// Raíz del almacenamiento en disco. En dev: ./uploads. En prod: /var/lib/shareable/uploads.
export function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
}

// Regex única usada por todos los validadores. UUID v4 lower/upper + .webp.
const UPLOAD_URL_RE = /^\/uploads\/(items|avatars)\/([a-f0-9-]{36}\.webp)$/i;

// Resuelve una URL pública (/uploads/items/<uuid>.webp) a la ruta absoluta en disco,
// protegiendo contra path traversal (los segmentos no pueden subir niveles).
export function resolveUploadPath(relative: string): string | null {
  const m = `/uploads/${relative}`.match(UPLOAD_URL_RE);
  if (!m) return null;
  return path.join(uploadRoot(), m[1], m[2]);
}

export async function processAndSaveImage(
  bytes: Buffer,
  kind: UploadKind,
): Promise<{ url: string; size: number }> {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new UploadError("La imagen no puede superar 5 MB.", 413);
  }

  // Validación con magic bytes — no confiar en el Content-Type del cliente.
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || !(ALLOWED_MIMES as readonly string[]).includes(detected.mime)) {
    throw new UploadError("Formato no permitido (solo JPG, PNG o WebP).", 415);
  }

  // Re-encoding obligatorio: descarta EXIF (GPS) y normaliza a webp.
  // `limitInputPixels` evita pixel-bombs (PNG con dimensiones masivas).
  let processed: Buffer;
  try {
    processed = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate() // aplica orientación EXIF antes de borrarla
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    // Pixel-bomb, formato corrupto, libvips warning… todos van por aquí.
    throw new UploadError("Imagen corrupta o demasiado grande.", 415);
  }

  const dir = path.join(uploadRoot(), kind);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.webp`;
  const abs = path.join(dir, filename);
  // Escritura directa: sharp ya ha producido el buffer final, no re-decodificar.
  await writeFile(abs, processed);

  return {
    url: `/uploads/${kind}/${filename}`,
    size: processed.byteLength,
  };
}

export async function deleteUpload(url: string): Promise<void> {
  const abs = resolveUploadPath(url.replace(/^\/uploads\//, ""));
  if (!abs) return;
  try {
    await unlink(abs);
  } catch {
    // Si no existe, no es un error fatal — log silencioso.
  }
}

export async function fileExists(abs: string): Promise<boolean> {
  try {
    await stat(abs);
    return true;
  } catch {
    return false;
  }
}

export class UploadError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

// ─── Rate limiter en memoria ────────────────────────────────────────────────
// Mapa userId → ventana deslizante de timestamps. Para el MVP single-process
// con PM2 es suficiente; tras escalar a varios workers habrá que mover esto
// a Redis o a una columna en BD.
const UPLOAD_LIMIT = 30; // máximo 30 uploads
const UPLOAD_WINDOW_MS = 60 * 60 * 1000; // por hora rodante
const uploadWindow = new Map<string, number[]>();

export function checkUploadRate(userId: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - UPLOAD_WINDOW_MS;
  const stamps = (uploadWindow.get(userId) ?? []).filter((t) => t > cutoff);
  if (stamps.length >= UPLOAD_LIMIT) {
    const retryAfter = Math.ceil((stamps[0] + UPLOAD_WINDOW_MS - now) / 1000);
    uploadWindow.set(userId, stamps);
    return { ok: false, retryAfter };
  }
  stamps.push(now);
  uploadWindow.set(userId, stamps);
  return { ok: true };
}
