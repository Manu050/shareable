import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { jitterCoord } from "@/lib/geo";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  // Radio en metros. 0 / vacío => sin filtro.
  radius: z.coerce.number().int().min(0).max(50_000).optional(),
});

type NearbyRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  price_per_day: string;
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

  // Construimos la cláusula WHERE como Prisma.sql para mantener la
  // parametrización de extremo a extremo (sin $queryRawUnsafe).
  const radiusClause =
    radius && radius > 0
      ? Prisma.sql`AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(i.longitude, i.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radius}
        )`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<NearbyRow[]>(Prisma.sql`
    SELECT
      i.id,
      i.title,
      -- Trunco la descripción en BD: la card sólo muestra 2 líneas. Reduce
      -- payload notablemente cuando hay descripciones largas.
      LEFT(i.description, 240) AS description,
      i.category,
      i.price_per_day,
      cover.url AS cover_url,
      i.latitude,
      i.longitude,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(i.longitude, i.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) AS distance_m,
      u.full_name AS owner_name,
      u.avatar_url AS owner_image
    FROM items i
    JOIN users u ON u.id = i.owner_id
    -- LATERAL evita la subquery correlacionada por fila. Postgres planifica
    -- un index scan único sobre item_images(item_id, position) que es O(log n)
    -- por item en lugar de O(n_images_de_ese_item).
    LEFT JOIN LATERAL (
      SELECT ii.url
      FROM item_images ii
      WHERE ii.item_id = i.id
      ORDER BY ii.position ASC
      LIMIT 1
    ) AS cover ON true
    WHERE i.is_active = true
      ${radiusClause}
    ORDER BY distance_m ASC
    LIMIT 200
  `);

  const items = rows.map((r) => {
    const j = jitterCoord(r.id, r.latitude, r.longitude);
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      pricePerDay: Number(r.price_per_day),
      imageUrl: r.cover_url,
      latitude: j.latitude,
      longitude: j.longitude,
      distanceM: Math.round(r.distance_m),
      owner: { name: r.owner_name, image: r.owner_image },
    };
  });

  return NextResponse.json({ items });
}
