import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchSchema = z.object({
  action: z.enum(["accept", "reject"]),
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

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const request = await prisma.request.findUnique({
    where: { id },
    include: { item: { select: { ownerId: true } } },
  });
  if (!request) {
    return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
  }
  if (request.item.ownerId !== session.user.id) {
    return NextResponse.json(
      { error: "Solo el dueño puede aceptar o rechazar." },
      { status: 403 },
    );
  }
  if (request.status !== "pending") {
    return NextResponse.json(
      { error: "Esta reserva ya no está pendiente." },
      { status: 409 },
    );
  }

  const updated = await prisma.request.update({
    where: { id },
    data: { status: parsed.data.action === "accept" ? "accepted" : "rejected" },
    select: { id: true, status: true },
  });

  return NextResponse.json({ request: updated });
}
