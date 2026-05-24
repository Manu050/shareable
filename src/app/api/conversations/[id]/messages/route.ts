import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// Verifica que el usuario sea participante de la conversación.
async function assertMember(convId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: convId,
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    select: { id: true, user1Id: true, user2Id: true },
  });
}

// GET /api/conversations/[id]/messages
// Devuelve mensajes ordenados ASC y marca como leídos los del otro usuario.
// Acepta ?since=<ISO> para modo delta (polling).
export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const conv = await assertMember(id, session.user.id);
  if (!conv) {
    return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
  }

  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since");
  const sinceDate = sinceRaw ? new Date(sinceRaw) : null;
  const hasSince = sinceDate && !Number.isNaN(sinceDate.getTime());

  // Lee primero, marca después. Si invirtiéramos el orden, un mensaje que
  // llegue entre updateMany y findMany quedaría como leído sin haberse
  // entregado al cliente — se perdería en el badge de "no leídos".
  const messages = await prisma.directMessage.findMany({
    where: {
      conversationId: id,
      ...(hasSince ? { createdAt: { gt: sinceDate! } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  // Sólo marcamos como leídos los que efectivamente cargamos (createdAt <= max).
  // En modo delta restringimos también el límite inferior para no marcar nada
  // anterior al `since` (esos ya fueron entregados en cargas previas).
  const last = messages[messages.length - 1];
  if (last) {
    await prisma.directMessage.updateMany({
      where: {
        conversationId: id,
        senderId: { not: session.user.id },
        readAt: null,
        createdAt: {
          ...(hasSince ? { gt: sinceDate! } : {}),
          lte: last.createdAt,
        },
      },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({ messages });
}

// POST /api/conversations/[id]/messages
// Envía un nuevo mensaje a la conversación.
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const conv = await assertMember(id, session.user.id);
  if (!conv) {
    return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = z
    .object({ content: z.string().trim().min(1).max(2000) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensaje inválido." }, { status: 400 });
  }

  const message = await prisma.directMessage.create({
    data: {
      conversationId: id,
      senderId: session.user.id,
      content: parsed.data.content,
    },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
