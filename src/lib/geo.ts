import { createHash } from "node:crypto";

// CLAUDE.md §6 — Privacidad geométrica.
//
// Aplicamos jitter ~±45 m en las respuestas públicas para no exponer la
// dirección exacta del vecino. El jitter debe ser DETERMINÍSTICO por entidad:
// si fuese aleatorio, un atacante podría hacer N requests y promediar para
// recuperar la coordenada original.
//
// Derivamos el offset de un hash SHA-256 de (entityId + ENV_SEED). Mientras
// el seed no rote, las coordenadas mostradas son estables → no se puede
// triangular por muestreo.
//
// SEGURIDAD: si el seed es público (default conocido o code leak), un atacante
// con el ID del item puede recomputar el offset exacto y recuperar la coord
// real. Por eso JITTER_SEED es OBLIGATORIO en producción.

if (process.env.NODE_ENV === "production" && !process.env.JITTER_SEED) {
  throw new Error(
    "JITTER_SEED es obligatorio en producción. Genera uno con `openssl rand -hex 32` y añádelo al .env.",
  );
}

const JITTER_DEG = 0.0004; // ~45 m a la latitud de Madrid
const SEED = process.env.JITTER_SEED ?? "shareable-jitter-dev-only";

function offsetFor(id: string, axis: "lat" | "lng"): number {
  const h = createHash("sha256").update(id).update(axis).update(SEED).digest();
  // Tomamos 4 bytes → entero 32-bit sin signo → normalizado a [-1, 1).
  const v = h.readUInt32BE(0) / 0xffffffff;
  return (v - 0.5) * 2 * JITTER_DEG;
}

export function jitterCoord(id: string, lat: number, lng: number) {
  return {
    latitude: lat + offsetFor(id, "lat"),
    longitude: lng + offsetFor(id, "lng"),
  };
}
