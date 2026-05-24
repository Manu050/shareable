import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertParticipant } from "@/lib/request-access";

export async function GET(
  req: Request,
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

  // ?since=<ISO> → solo mensajes posteriores. Reduce el payload del polling
  // de ~500 filas a ~0-2 por tick, que es lo normal en estado estacionario.
  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since");
  const sinceDate = sinceRaw ? new Date(sinceRaw) : null;
  const hasSince = sinceDate && !Number.isNaN(sinceDate.getTime());

  const messages = await prisma.message.findMany({
    where: {
      requestId: id,
      ...(hasSince ? { createdAt: { gt: sinceDate! } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({ messages });
}
