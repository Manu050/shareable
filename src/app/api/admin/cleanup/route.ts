import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanupOrphanUploads } from "@/lib/cleanup";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  const result = await cleanupOrphanUploads();
  return NextResponse.json(result);
}
