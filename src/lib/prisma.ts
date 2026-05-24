import { PrismaClient } from "@prisma/client";

// En desarrollo Next.js recarga módulos en caliente; reutilizamos la instancia
// guardándola en globalThis para no abrir una conexión nueva por cada HMR.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// El log de `query` filtra cada SQL con sus valores parametrizados; útil pero
// ruidoso y un vector de leak si los logs aterrizan en disco. Activable con
// `DEBUG_PRISMA=1` para no perderlo cuando hace falta.
const logLevels =
  process.env.DEBUG_PRISMA === "1"
    ? (["query", "error", "warn"] as const)
    : process.env.NODE_ENV === "development"
      ? (["error", "warn"] as const)
      : (["error"] as const);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: [...logLevels] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
