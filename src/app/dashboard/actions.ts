"use server";

import { revalidatePath } from "next/cache";
import type { RequestStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mailDoubleCheckComplete } from "@/lib/mailer";

type Result = { ok: true } | { ok: false; error: string };

// Verifica sesión + rol esperado + ejecuta la transición de forma ATÓMICA
// (update condicional por estado). Si dos clicks llegan a la vez sólo uno
// pasa el WHERE, evitando emails duplicados y estados duplicados.
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

  // Lectura mínima sólo para resolver roles. La autoridad real está en el
  // WHERE del updateMany de abajo.
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      borrowerId: true,
      item: {
        select: {
          ownerId: true,
          title: true,
          owner: { select: { email: true, name: true } },
        },
      },
      borrower: { select: { email: true, name: true } },
    },
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

  // Update atómico: la condición `status: from` actúa como CAS (compare-and-set).
  const result = await prisma.request.updateMany({
    where: { id: requestId, status: from },
    data: { status: to },
  });
  if (result.count !== 1) {
    return { ok: false, error: "El préstamo no está en el estado esperado." };
  }

  revalidatePath("/dashboard");

  // Notificaciones — sólo si la transición efectivamente ocurrió (count===1).
  if (to === "in_progress") {
    const title = request.item.title;
    void mailDoubleCheckComplete(request.item.owner.email, request.item.owner.name, title, "delivered");
    void mailDoubleCheckComplete(request.borrower.email, request.borrower.name, title, "delivered");
  } else if (to === "completed") {
    const title = request.item.title;
    void mailDoubleCheckComplete(request.item.owner.email, request.item.owner.name, title, "returned");
    void mailDoubleCheckComplete(request.borrower.email, request.borrower.name, title, "returned");
  }

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
