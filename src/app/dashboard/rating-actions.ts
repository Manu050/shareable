"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Result = { ok: true } | { ok: false; error: string };

const RatingSchema = z.object({
  requestId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export async function submitRating(input: unknown): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "No autenticado." };

  const parsed = RatingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(" · ") ?? "Datos inválidos.",
    };
  }

  const userId = session.user.id;
  const request = await prisma.request.findUnique({
    where: { id: parsed.data.requestId },
    select: {
      status: true,
      borrowerId: true,
      item: { select: { ownerId: true } },
    },
  });
  if (!request) return { ok: false, error: "Reserva no encontrada." };
  if (request.status !== "completed") {
    return { ok: false, error: "Solo puedes valorar préstamos finalizados." };
  }

  const isOwner = request.item.ownerId === userId;
  const isBorrower = request.borrowerId === userId;
  if (!isOwner && !isBorrower) {
    return { ok: false, error: "No participaste en este préstamo." };
  }
  // Cada parte valora a la otra.
  const ratedUserId = isOwner ? request.borrowerId : request.item.ownerId;

  try {
    await prisma.userRating.create({
      data: {
        requestId: parsed.data.requestId,
        raterUserId: userId,
        ratedUserId,
        stars: parsed.data.stars,
        comment: parsed.data.comment ?? null,
      },
    });
  } catch (err) {
    // Unique (requestId, raterUserId) → ya votó.
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002") {
      return { ok: false, error: "Ya valoraste este préstamo." };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/usuarios/${ratedUserId}`);
  return { ok: true };
}
