import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RequestSchema = z
  .object({
    itemId: z.string().uuid("ID de objeto inválido."),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "La fecha final no puede ser anterior a la inicial.",
    path: ["endDate"],
  });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { itemId, startDate, endDate } = parsed.data;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, ownerId: true, isActive: true },
  });
  if (!item || !item.isActive) {
    return NextResponse.json({ error: "Objeto no disponible." }, { status: 404 });
  }
  if (item.ownerId === session.user.id) {
    return NextResponse.json(
      { error: "No puedes reservar tu propio objeto." },
      { status: 400 },
    );
  }

  const request = await prisma.request.create({
    data: {
      itemId,
      borrowerId: session.user.id,
      startDate,
      endDate,
      // status por defecto = pending (estado inicial PENDING)
    },
    select: { id: true },
  });

  return NextResponse.json({ request }, { status: 201 });
}
