import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertParticipant } from "@/lib/request-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const part = await assertParticipant(id, session.user.id);
  if (!part) {
    return NextResponse.json(
      { error: "Reserva no encontrada o no participas." },
      { status: 404 },
    );
  }

  const messages = await prisma.message.findMany({
    where: { requestId: id },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({ messages });
}
