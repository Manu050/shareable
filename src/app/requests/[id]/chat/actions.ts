"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertParticipant } from "@/lib/request-access";
import { mailNewMessage } from "@/lib/mailer";

const CreateSchema = z.object({
  requestId: z.string().uuid(),
  content: z
    .string()
    .trim()
    .min(1, "Escribe algo.")
    .max(2000, "Máximo 2000 caracteres."),
});

type Result = { ok: true } | { ok: false; error: string };

export async function createMessage(input: {
  requestId: string;
  content: string;
}): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "No autenticado." };

  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(" · ") ?? "Datos inválidos.",
    };
  }

  const part = await assertParticipant(parsed.data.requestId, session.user.id);
  if (!part) {
    return { ok: false, error: "Reserva no encontrada o no participas." };
  }

  await prisma.message.create({
    data: {
      requestId: parsed.data.requestId,
      senderId: session.user.id,
      content: parsed.data.content,
    },
  });

  // El SSR del chat lo invalidamos por si alguien recarga la página manualmente;
  // el polling SWR es quien hace la actualización en vivo entre los dos lados.
  revalidatePath(`/requests/${parsed.data.requestId}/chat`);

  // Notify the other participant about the new message (fire-and-forget).
  const recipientId =
    session.user.id === part.ownerId ? part.borrowerId : part.ownerId;
  // Una sola query: el `in` trae sender + recipient juntos.
  const both = await prisma.user.findMany({
    where: { id: { in: [session.user.id, recipientId] } },
    select: { id: true, email: true, name: true },
  });
  const sender = both.find((u) => u.id === session.user.id);
  const recipient = both.find((u) => u.id === recipientId);
  if (recipient) {
    mailNewMessage(
      recipient.email,
      recipient.name,
      sender?.name ?? null,
      parsed.data.requestId,
    ).catch((err) => console.error("[mailNewMessage] failed:", err));
  }

  return { ok: true };
}
