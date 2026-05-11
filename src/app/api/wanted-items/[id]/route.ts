import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EXTEND_DAYS = 30;

const PatchSchema = z.object({
  action: z.enum(["fulfill", "cancel", "extend"]),
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

  let data: { status?: "fulfilled" | "cancelled"; expiresAt?: Date };
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
  }

  const updated = await prisma.wantedItem.update({
    where: { id },
    data,
    select: { id: true, status: true, expiresAt: true },
  });

  return NextResponse.json({ wanted: updated });
}
