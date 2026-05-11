import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { ITEM_CATEGORIES, DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { findMatchesForItem, persistMatches } from "@/lib/wanted-matcher";

const ItemSchema = z.object({
  title: z.string().trim().min(3, "El título debe tener al menos 3 caracteres.").max(120),
  description: z.string().trim().min(10, "La descripción debe tener al menos 10 caracteres."),
  category: z.enum(ITEM_CATEGORIES),
  pricePerDay: z
    .number()
    .min(0, "El precio no puede ser negativo.")
    .max(10000),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  images: z
    .array(z.string().regex(/^\/uploads\/items\/[a-f0-9-]{36}\.webp$/i))
    .max(4)
    .optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = ItemSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { title, description, category, pricePerDay, latitude, longitude, images } =
    parsed.data;

  const item = await prisma.item.create({
    data: {
      ownerId: session.user.id,
      title,
      description,
      category,
      pricePerDay,
      depositAmount: 0,
      latitude: latitude ?? DEFAULT_LATITUDE,
      longitude: longitude ?? DEFAULT_LONGITUDE,
      images: images?.length
        ? {
            create: images.map((url, position) => ({ url, position })),
          }
        : undefined,
    },
    select: {
      id: true,
      ownerId: true,
      category: true,
      pricePerDay: true,
      latitude: true,
      longitude: true,
    },
  });

  // Match síncrono contra peticiones "Se busca" abiertas. Coste despreciable
  // a escala de barrio; sin colas ni workers (CLAUDE.md §5).
  const matches = await findMatchesForItem(item);
  const matchCount = await persistMatches(
    matches.map(({ id }) => ({ wantedItemId: id, itemId: item.id })),
  );

  return NextResponse.json(
    { item: { id: item.id }, matched: matchCount },
    { status: 201 },
  );
}
