import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ReportSchema = z.object({
  requestId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "El motivo debe tener al menos 10 caracteres.")
    .max(2000, "Máximo 2000 caracteres."),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const parsed = ReportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { requestId, reason } = parsed.data;

  // El reporter debe ser parte del préstamo (borrower o owner del item).
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { item: { select: { ownerId: true } } },
  });
  if (!request) {
    return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
  }
  const userId = session.user.id;
  if (request.borrowerId !== userId && request.item.ownerId !== userId) {
    return NextResponse.json(
      { error: "Solo puedes reportar reservas en las que participas." },
      { status: 403 },
    );
  }

  const report = await prisma.report.create({
    data: { requestId, reporterId: userId, reason },
    select: { id: true },
  });

  return NextResponse.json({ report }, { status: 201 });
}
