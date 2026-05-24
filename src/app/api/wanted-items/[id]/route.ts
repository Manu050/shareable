import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { ITEM_CATEGORIES } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

const EXTEND_DAYS = 30;

const ALLOWED_RADII = [1000, 2000, 5000, 10_000] as const;

const PatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["fulfill", "cancel", "extend"]) }),
  z.object({
    action: z.literal("edit"),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(2000).optional(),
    category: z.enum(ITEM_CATEGORIES),
    maxPricePerDay: z.number().min(0).max(10000).nullable().optional(),
    // Alineado con POST: sólo radios discretos para que el filtro de mapa
    // tenga sentido y no produzca aros raros.
    radiusM: z
      .number()
      .int()
      .refine((v) => (ALLOWED_RADII as readonly number[]).includes(v), {
        message: "Radio no permitido.",
      })
      .optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const wanted = await prisma.wantedItem.findUnique({
    where: { id },
    select: { id: true, requesterId: true, status: true, expiresAt: true },
  });
  if (!wanted) {
    return NextResponse.json({ error: "Petición no encontrada." }, { status: 404 });
  }
  if (wanted.requesterId !== session.user.id) {
    return NextResponse.json(
      { error: "Solo el autor de la petición puede modificarla." },
      { status: 403 },
    );
  }

  let data: Record<string, unknown>;
  switch (parsed.data.action) {
    case "fulfill":
      data = { status: "fulfilled" };
      break;
    case "cancel":
      data = { status: "cancelled" };
      break;
    case "extend": {
      const base =
        wanted.expiresAt && wanted.expiresAt > new Date()
          ? wanted.expiresAt
          : new Date();
      data = { expiresAt: new Date(base.getTime() + EXTEND_DAYS * 86_400_000) };
      break;
    }
    case "edit": {
      const { title, description, category, maxPricePerDay, radiusM, latitude, longitude } =
        parsed.data;
      data = {
        title,
        ...(description != null ? { description } : {}),
        category,
        ...(maxPricePerDay != null ? { maxPricePerDay } : {}),
        ...(radiusM != null ? { radiusM } : {}),
        ...(latitude != null ? { latitude } : {}),
        ...(longitude != null ? { longitude } : {}),
      };
      break;
    }
  }

  const updated = await prisma.wantedItem.update({
    where: { id },
    data,
    select: { id: true, status: true, expiresAt: true },
  });

  return NextResponse.json({ wanted: updated });
}
