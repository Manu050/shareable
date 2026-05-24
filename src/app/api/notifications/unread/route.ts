import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications/unread
// Devuelve el total de DMs no leídos para el badge del navbar.
// Polled por el cliente cada 15 s.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ dms: 0 });
  }

  const userId = session.user.id;

  const count = await prisma.directMessage.count({
    where: {
      readAt: null,
      senderId: { not: userId },
      conversation: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    },
  });

  return NextResponse.json({ dms: count });
}
