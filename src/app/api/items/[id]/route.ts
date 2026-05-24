import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { ITEM_CATEGORIES } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { deleteUpload } from "@/lib/uploads";

const EditSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(ITEM_CATEGORIES),
  pricePerDay: z.number().min(0).max(10000),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  // Existing image URLs to keep (in desired order). Images not present here are deleted.
  keepImages: z
    .array(z.string().regex(/^\/uploads\/items\/[a-f0-9-]{36}\.webp$/i))
    .max(4)
    .optional(),
  // Newly uploaded image URLs to append.
  newImages: z
    .array(z.string().regex(/^\/uploads\/items\/[a-f0-9-]{36}\.webp$/i))
    .max(4)
    .optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const item = await prisma.item.findUnique({
    where: { id },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!item || !item.isActive) {
    return NextResponse.json({ error: "Objeto no encontrado." }, { status: 404 });
  }
  if (item.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Solo el dueño puede editar este objeto." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = EditSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" · ") ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { title, description, category, pricePerDay, latitude, longitude, keepImages = [], newImages = [] } =
    parsed.data;

  // `keepImages` debe ser subconjunto de las imágenes actuales del item: evita
  // que el dueño cuele URLs ajenas (o de otros items suyos) en la galería.
  const ownedUrls = new Set(item.images.map((i) => i.url));
  for (const url of keepImages) {
    if (!ownedUrls.has(url)) {
      return NextResponse.json(
        { error: "Imagen no pertenece a este objeto." },
        { status: 400 },
      );
    }
  }

  // Anti-hijacking de las imágenes nuevas (mismo razonamiento que en POST).
  if (newImages.length > 0) {
    const taken = await prisma.itemImage.findFirst({
      where: {
        url: { in: newImages },
        item: { ownerId: { not: session.user.id } },
      },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { error: "Alguna imagen no está disponible." },
        { status: 409 },
      );
    }
  }

  // Determine which existing images to remove.
  const keepSet = new Set(keepImages);
  const toDelete = item.images.filter((img) => !keepSet.has(img.url));

  // Build final ordered list: kept images (in keepImages order) + new images.
  const finalImages = [...keepImages, ...newImages];
  if (finalImages.length > 4) {
    return NextResponse.json({ error: "Máximo 4 imágenes." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.item.update({
      where: { id },
      data: {
        title,
        description,
        category,
        pricePerDay,
        ...(latitude != null ? { latitude } : {}),
        ...(longitude != null ? { longitude } : {}),
      },
    });

    // Replace all image records atomically.
    await tx.itemImage.deleteMany({ where: { itemId: id } });
    if (finalImages.length > 0) {
      await tx.itemImage.createMany({
        data: finalImages.map((url, position) => ({ itemId: id, url, position })),
      });
    }
  });

  // Delete removed files from disk after the DB transaction succeeds.
  await Promise.all(toDelete.map((img) => deleteUpload(img.url)));

  return NextResponse.json({ ok: true });
}
