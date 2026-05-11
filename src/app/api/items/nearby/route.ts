import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  // Radio en metros. 0 / vacío => sin filtro.
  radius: z.coerce.number().int().min(0).max(50_000).optional(),
});

// Ruido espacial (~50 m) para no exponer direcciones exactas.
// CLAUDE.md §6 — privacidad geométrica.
function jitter(value: number) {
  // ~ ±0.0004° ≈ 45 m a la latitud de Madrid.
  return value + (Math.random() - 0.5) * 0.0008;
}

type NearbyRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  price_per_day: string; // numeric llega como string desde pg
  cover_url: string | null;
  latitude: number;
  longitude: number;
  distance_m: number;
  owner_name: string | null;
  owner_image: string | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }
  const { lat, lng, radius } = parsed.data;

  const point = `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
  const itemPoint = `ST_SetSRID(ST_MakePoint(i.longitude, i.latitude), 4326)::geography`;
  const distance = `ST_Distance(${itemPoint}, ${point})`;
  const where = radius && radius > 0 ? `WHERE i.is_active = true AND ST_DWithin(${itemPoint}, ${point}, ${radius})` : `WHERE i.is_active = true`;

  // Consulta espacial PostGIS — radio en metros, orden por distancia.
  const rows = await prisma.$queryRawUnsafe<NearbyRow[]>(`
    SELECT
      i.id,
      i.title,
      i.description,
      i.category,
      i.price_per_day,
      (
        SELECT ii.url
        FROM item_images ii
        WHERE ii.item_id = i.id
        ORDER BY ii.position ASC
        LIMIT 1
      ) AS cover_url,
      i.latitude,
      i.longitude,
      ${distance} AS distance_m,
      u.full_name AS owner_name,
      u.avatar_url AS owner_image
    FROM items i
    JOIN users u ON u.id = i.owner_id
    ${where}
    ORDER BY distance_m ASC
    LIMIT 200;
  `);

  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    pricePerDay: Number(r.price_per_day),
    imageUrl: r.cover_url,
    // Coordenadas con ruido — el front no necesita la dirección exacta.
    latitude: jitter(r.latitude),
    longitude: jitter(r.longitude),
    distanceM: Math.round(r.distance_m),
    owner: { name: r.owner_name, image: r.owner_image },
  }));

  return NextResponse.json({ items });
}
