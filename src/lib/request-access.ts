import { prisma } from "@/lib/prisma";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Comprueba que `userId` es el borrower o el dueño del item asociado a la request.
// Devuelve { ownerId, borrowerId, status } o null si no participa o el id no es UUID.
export async function assertParticipant(requestId: string, userId: string) {
  if (!UUID_RE.test(requestId)) return null;
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
