import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mailNewRequest } from "@/lib/mailer";

// Acepta tanto ISO completos como YYYY-MM-DD. Si llegó un YYYY-MM-DD, lo
// parseamos a medianoche local del servidor para evitar drift por TZ del
// cliente (un mismo día puede salir 23:00 UTC del día anterior).
const DateSchema = z.preprocess((v) => {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(`${v}T00:00:00`);
  }
  return v;
}, z.coerce.date());

const RequestSchema = z
  .object({
    itemId: z.string().uuid("ID de objeto inválido."),
    startDate: DateSchema,
    endDate: DateSchema,
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "La fecha final no puede ser anterior a la inicial.",
    path: ["endDate"],
  })
  .refine(
    (d) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d.startDate >= today;
    },
    { message: "La fecha de inicio no puede ser en el pasado.", path: ["startDate"] },
  );

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" · ") ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { itemId, startDate, endDate } = parsed.data;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      ownerId: true,
      isActive: true,
      title: true,
      owner: { select: { email: true, name: true } },
    },
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

  // Evita spam: una sola petición pending del mismo borrower al mismo item.
  const existing = await prisma.request.findFirst({
    where: { itemId, borrowerId: session.user.id, status: "pending" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya tienes una solicitud pendiente para este objeto." },
      { status: 409 },
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

  // Fire-and-forget email; logamos el reject para no perderlo en silencio.
  mailNewRequest(item.owner.email, item.owner.name, item.title, request.id).catch(
    (err) => console.error("[mailNewRequest] failed:", err),
  );

  return NextResponse.json({ request }, { status: 201 });
}
