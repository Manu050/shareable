import { prisma } from "@/lib/prisma";

// Comprueba que `userId` es el borrower o el dueño del item asociado a la request.
// Devuelve { ownerId, borrowerId, status } o null si no participa.
export async function assertParticipant(requestId: string, userId: string) {
  const r = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      status: true,
      borrowerId: true,
      item: { select: { ownerId: true } },
    },
  });
  if (!r) return null;
  if (r.borrowerId !== userId && r.item.ownerId !== userId) return null;
  return {
    ownerId: r.item.ownerId,
    borrowerId: r.borrowerId,
    status: r.status,
  };
}
