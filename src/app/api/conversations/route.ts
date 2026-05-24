import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Ordena el par de UUIDs para satisfacer el unique constraint (user1 < user2).
function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// POST /api/conversations  — find-or-create conversación con otro usuario.
// body: { userId: string }  → retorna { conversation: { id } }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = z.object({ userId: z.string().uuid() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "userId inválido." }, { status: 400 });
  }

  const targetId = parsed.data.userId;
  if (targetId === session.user.id) {
    return NextResponse.json({ error: "No puedes escribirte a ti mismo." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  const [u1, u2] = orderedPair(session.user.id, targetId);

  const conversation = await prisma.conversation.upsert({
    where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    create: { user1Id: u1, user2Id: u2 },
    update: {},
    select: { id: true },
  });

  return NextResponse.json({ conversation });
}

// GET /api/conversations  — bandeja: todas las conversaciones del usuario,
// con el último mensaje y el contador de no leídos.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const userId = session.user.id;

  const [convs, unreadCounts] = await Promise.all([
    prisma.conversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      orderBy: { createdAt: "desc" },
      include: {
        user1: { select: { id: true, name: true, image: true } },
        user2: { select: { id: true, name: true, image: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, senderId: true },
        },
      },
    }),
    prisma.directMessage.groupBy({
      by: ["conversationId"],
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      },
      _count: { id: true },
    }),
  ]);
  const unreadMap = new Map(unreadCounts.map((r) => [r.conversationId, r._count.id]));

  // Orden por timestamp del último mensaje (fallback: createdAt de la conv
  // si todavía no hay mensajes). La cardinalidad por usuario es bajísima
  // (decenas), por eso el sort en JS es preferible a un raw SQL con
  // max(dm.created_at) — además mantiene la consulta Prisma como `findMany`
  // tipado y sin escapar a `$queryRaw`.
  const result = convs
    .map((c) => {
      const last = c.messages[0] ?? null;
      const sortAt = last?.createdAt ?? c.createdAt;
      return {
        id: c.id,
        other: c.user1Id === userId ? c.user2 : c.user1,
        lastMessage: last,
        unread: unreadMap.get(c.id) ?? 0,
        sortAt,
      };
    })
    .sort((a, b) => b.sortAt.getTime() - a.sortAt.getTime())
    .map(({ sortAt: _sortAt, ...rest }) => rest);

  return NextResponse.json({ conversations: result });
}
