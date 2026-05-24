import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

// Limitador persistente — fixed-window por clave `<scope>:<subject>`. Atómico:
// el INSERT…ON CONFLICT incrementa y devuelve el nuevo count en una sola ida
// a BD. Si dos requests llegan simultáneamente, ambos verán counts
// secuenciales y la decisión es siempre coherente.
//
// Reemplaza los `Map<string, number[]>` en memoria que NO sobrevivían a un
// restart de PM2 ni funcionarían con cluster mode.
export async function checkRateLimit(
  scope: string,
  subject: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const key = `${scope}:${subject}`;
  const windowEnd = new Date(Date.now() + windowMs);

  const rows = await prisma.$queryRaw<{ count: number; window_end: Date }[]>(Prisma.sql`
    INSERT INTO rate_limit_buckets ("key", "window_end", "count")
    VALUES (${key}, ${windowEnd}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "window_end" = CASE
        WHEN rate_limit_buckets."window_end" <= NOW() THEN EXCLUDED."window_end"
        ELSE rate_limit_buckets."window_end"
      END,
      "count" = CASE
        WHEN rate_limit_buckets."window_end" <= NOW() THEN 1
        ELSE rate_limit_buckets."count" + 1
      END
    RETURNING "count", "window_end"
  `);

  const row = rows[0];
  if (!row) {
    // Imposible en la práctica (RETURNING siempre devuelve fila tras upsert).
    // Si pasara, fail-open es preferible a bloquear todo el endpoint.
    return { ok: true };
  }
  if (row.count > limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((row.window_end.getTime() - Date.now()) / 1000),
    );
    return { ok: false, retryAfter };
  }
  return { ok: true };
}

// Llamada periódica para podar buckets expirados. Conviene meterla en el cron
// diario junto con `cleanup-orphans`.
export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await prisma.rateLimitBucket.deleteMany({
    where: { windowEnd: { lt: new Date() } },
  });
  return result.count;
}

// Helper estandarizado para sacar la IP del cliente tras un proxy. Si el
// servidor está detrás de Nginx, hay que asegurar que `proxy_set_header
// X-Forwarded-For $proxy_add_x_forwarded_for;` esté configurado.
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
