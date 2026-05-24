import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// Proxy server-side para Nominatim. Razones:
//  1. Nominatim exige `User-Agent` identificable (TOS) — el navegador no
//     permite setear UA, así que la llamada DEBE salir del servidor.
//  2. Nos permite ratelimit y cache de respuestas.
//
// Configura `GEOCODER_USER_AGENT` en .env con algo como:
//   "Shareable/1.0 (contacto: tu@email.com)"

export const runtime = "nodejs";
// Cache por 6 h en el edge / proxy (mismo query = misma respuesta razonable).
export const revalidate = 21600;

const QuerySchema = z.object({
  q: z.string().trim().min(3).max(120),
});

const USER_AGENT =
  process.env.GEOCODER_USER_AGENT ?? "Shareable/1.0 (https://shareable.local)";

// Rate-limit por IP: Nominatim permite ~1 rps absoluto. Limitamos a 30 req/min
// por IP cliente (el front ya hace debounce 800ms). Persistido en BD vía
// `checkRateLimit` para sobrevivir a restarts de PM2.
const GEOCODE_LIMIT = 30;
const GEOCODE_WINDOW_MS = 60_000;

export async function GET(req: Request) {
  // Sólo autenticados — evita que el endpoint sea un proxy abierto.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const ip = clientIp(req);
  const limit = await checkRateLimit("geocode", ip, GEOCODE_LIMIT, GEOCODE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiadas búsquedas." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Query inválida." }, { status: 400 });
  }

  const nominatim = new URL("https://nominatim.openstreetmap.org/search");
  nominatim.searchParams.set("q", parsed.data.q);
  nominatim.searchParams.set("format", "json");
  nominatim.searchParams.set("addressdetails", "0");
  nominatim.searchParams.set("limit", "5");
  nominatim.searchParams.set("countrycodes", "es");
  nominatim.searchParams.set("viewbox", "-3.75,40.55,-3.55,40.42");
  nominatim.searchParams.set("bounded", "1");

  try {
    const r = await fetch(nominatim, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "es",
      },
      // Cache server-side: si dos usuarios buscan lo mismo, una sola request a Nominatim.
      next: { revalidate: 21600 },
    });
    if (!r.ok) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }
    const data = (await r.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    // Devuelvo sólo lo que el cliente necesita.
    return NextResponse.json({
      results: data.map((d) => ({
        display_name: d.display_name,
        lat: d.lat,
        lon: d.lon,
      })),
    });
  } catch (err) {
    console.error("[geocode] failed:", err);
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
