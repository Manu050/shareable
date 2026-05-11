import { PrismaClient } from "@prisma/client";

// En desarrollo Next.js recarga módulos en caliente; reutilizamos la instancia
// guardándola en globalThis para no abrir una conexión nueva por cada HMR.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
