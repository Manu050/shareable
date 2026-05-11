import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { ITEM_CATEGORIES, DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { findMatchesForWanted, persistMatches } from "@/lib/wanted-matcher";

const WANTED_TTL_DAYS = 30;
const ALLOWED_RADII = [1000, 2000, 5000, 10_000] as const;

const CreateSchema = z.object({
  title: z.string().trim().min(3, "Título demasiado corto.").max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(ITEM_CATEGORIES),
  maxPricePerDay: z.number().min(0).max(10_000).nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusM: z.number().int().refine((v) => (ALLOWED_RADII as readonly number[]).includes(v), {
    message: "Radio no permitido.",
  }),
});

// Jitter ~±45 m para coordenadas en respuestas públicas (CLAUDE.md §6).
function jitter(value: number) {
  return value + (Math.random() - 0.5) * 0.0008;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const expiresAt = new Date(Date.now() + WANTED_TTL_DAYS * 24 * 60 * 60 * 1000);

  const wanted = await prisma.wantedItem.create({
    data: {
      requesterId: session.user.id,
      title: data.title,
      description: data.description,
      category: data.category,
      maxPricePerDay: data.maxPricePerDay ?? null,
      latitude: data.latitude ?? DEFAULT_LATITUDE,
      longitude: data.longitude ?? DEFAULT_LONGITUDE,
      radiusM: data.radiusM,
      expiresAt,
    },
  });

  // Match retroactivo contra items existentes.
  const matches = await findMatchesForWanted({
    id: wanted.id,
    requesterId: wanted.requesterId,
    category: wanted.category,
    maxPricePerDay: wanted.maxPricePerDay,
    latitude: wanted.latitude,
    longitude: wanted.longitude,
    radiusM: wanted.radiusM,
  });
  await persistMatches(
    matches.map(({ id }) => ({ wantedItemId: wanted.id, itemId: id })),
  );

  return NextResponse.json(
    { wanted: { id: wanted.id, matched: matches.length } },
    { status: 201 },
  );
}

const QuerySchema = z.object({
  category: z.enum(ITEM_CATEGORIES).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().int().min(0).max(50_000).optional(),
});

export async function GET(req: Request) {
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }
  const { category, lat, lng, radius } = parsed.data;

  const filterByDistance =
    typeof lat === "number" && typeof lng === "number" && radius && radius > 0;

  type Row = {
    id: string;
    title: string;
    description: string | null;
    category: string;
    max_price_per_day: string | null;
    latitude: number;
    longitude: number;
    radius_m: number;
    created_at: Date;
    expires_at: Date | null;
    requester_name: string | null;
    requester_image: string | null;
  };

  const where = `
    WHERE w.status = 'open'
      AND (w.expires_at IS NULL OR w.expires_at > now())
      ${category ? `AND w.category = '${category.replace(/'/g, "''")}'` : ""}
      ${filterByDistance ? `AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radius}
      )` : ""}
  `;

  const rows = await prisma.$queryRawUnsafe<Row[]>(`
    SELECT
      w.id, w.title, w.description, w.category, w.max_price_per_day,
      w.latitude, w.longitude, w.radius_m, w.created_at, w.expires_at,
      u.full_name AS requester_name, u.avatar_url AS requester_image
    FROM wanted_items w
    JOIN users u ON u.id = w.requester_id
    ${where}
    ORDER BY w.created_at DESC
    LIMIT 200;
  `);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      maxPricePerDay: r.max_price_per_day == null ? null : Number(r.max_price_per_day),
      latitude: jitter(r.latitude),
      longitude: jitter(r.longitude),
      radiusM: r.radius_m,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      requester: { name: r.requester_name, image: r.requester_image },
    })),
  });
}
