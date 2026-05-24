import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";

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
// por IP cliente. En realidad da igual quién pregunte, lo que NO podemos es
// pasar de 1 rps total. Coordinarlo es responsabilidad del front (debounce).
const ipWindow = new Map<string, number[]>();
const LIMIT = 30;
const WINDOW = 60_000;
function ok(ip: string): boolean {
  const now = Date.now();
  const cut = now - WINDOW;
  const arr = (ipWindow.get(ip) ?? []).filter((t) => t > cut);
  if (arr.length >= LIMIT) {
    ipWindow.set(ip, arr);
    return false;
  }
  arr.push(now);
  ipWindow.set(ip, arr);
  return true;
}

export async function GET(req: Request) {
  // Sólo autenticados — evita que el endpoint sea un proxy abierto.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!ok(ip)) {
    return NextResponse.json({ error: "Demasiadas búsquedas." }, { status: 429 });
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
