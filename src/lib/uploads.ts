import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_DIMENSION = 1600;
export const WEBP_QUALITY = 82;

export type UploadKind = "items" | "avatars";

// Raíz del almacenamiento en disco. En dev: ./uploads. En prod: /var/lib/shareable/uploads.
export function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
}

function subdirFor(kind: UploadKind) {
  return path.join(uploadRoot(), kind);
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

// Resuelve una URL pública (/uploads/items/<uuid>.webp) a la ruta absoluta en disco,
// protegiendo contra path traversal (los segmentos no pueden subir niveles).
export function resolveUploadPath(relative: string): string | null {
  // relative llega como ["items", "<uuid>.webp"] o ["avatars", "<uuid>.webp"]
  const segments = relative.split("/").filter(Boolean);
  if (segments.length !== 2) return null;
  const [kind, file] = segments;
  if (kind !== "items" && kind !== "avatars") return null;
  if (!/^[a-f0-9-]{36}\.webp$/i.test(file)) return null;
  return path.join(uploadRoot(), kind, file);
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
  const processed = await sharp(bytes, { failOn: "error" })
    .rotate() // aplica orientación EXIF antes de borrarla
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const dir = subdirFor(kind);
  await ensureDir(dir);

  const filename = `${randomUUID()}.webp`;
  const abs = path.join(dir, filename);
  await sharp(processed).toFile(abs);

  return {
    url: `/uploads/${kind}/${filename}`,
    size: processed.byteLength,
  };
}

export async function deleteUpload(url: string): Promise<void> {
  // url tipo "/uploads/<kind>/<file>"
  const m = url.match(/^\/uploads\/(items|avatars)\/([a-f0-9-]{36}\.webp)$/i);
  if (!m) return;
  const abs = path.join(uploadRoot(), m[1], m[2]);
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
