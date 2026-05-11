"use server";

import { revalidatePath } from "next/cache";
import type { RequestStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Result = { ok: true } | { ok: false; error: string };

// Verifica sesión + lee la Request + comprueba rol y estado previo esperado.
// Encapsula la lógica común para las 4 transiciones del Doble Check.
async function transition(
  requestId: string,
  from: RequestStatus,
  to: RequestStatus,
  who: "owner" | "borrower",
): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No autenticado." };
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { item: { select: { ownerId: true } } },
  });
  if (!request) {
    return { ok: false, error: "Reserva no encontrada." };
  }

  const userId = session.user.id;
  const isOwner = request.item.ownerId === userId;
  const isBorrower = request.borrowerId === userId;

  if (who === "owner" && !isOwner) {
    return { ok: false, error: "Solo el dueño puede realizar esta acción." };
  }
  if (who === "borrower" && !isBorrower) {
    return { ok: false, error: "Solo el receptor puede realizar esta acción." };
  }
  if (request.status !== from) {
    return { ok: false, error: "El préstamo no está en el estado esperado." };
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { status: to },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}

// El dueño marca que ha entregado el objeto físicamente.
export async function deliverItem(requestId: string) {
  return transition(requestId, "accepted", "handed_over_by_owner", "owner");
}

// El receptor confirma que ha recibido el objeto. Cierra el primer doble check.
export async function confirmReceipt(requestId: string) {
  return transition(requestId, "handed_over_by_owner", "in_progress", "borrower");
}

// El receptor marca que ha devuelto el objeto.
export async function markReturned(requestId: string) {
  return transition(requestId, "in_progress", "returned_by_borrower", "borrower");
}

// El dueño confirma que ha recibido el objeto de vuelta. Cierra el segundo doble check.
export async function confirmReturn(requestId: string) {
  return transition(requestId, "returned_by_borrower", "completed", "owner");
}
