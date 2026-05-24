"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUpload } from "@/lib/uploads";

type Result = { ok: true } | { ok: false; error: string };

const ProfileSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(255),
  bio: z.string().trim().max(280, "Máximo 280 caracteres.").nullable().optional(),
  image: z
    .string()
    .regex(/^\/uploads\/avatars\/[a-f0-9-]{36}\.webp$/i)
    .nullable()
    .optional(),
});

export async function updateProfile(input: unknown): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "No autenticado." };

  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(" · ") ?? "Datos inválidos.",
    };
  }

  const userId = session.user.id;
  // Recupero el avatar actual para borrar el fichero anterior si cambia.
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  // Anti-hijacking: si la URL de avatar ya pertenece a OTRO usuario, rechaza.
  // Los UUIDs son aleatorios — la única forma de conocer una URL ajena es ver
  // su perfil público y copiarla. Bloqueamos ese escenario.
  if (parsed.data.image && parsed.data.image !== current?.image) {
    const collision = await prisma.user.findFirst({
      where: { image: parsed.data.image, NOT: { id: userId } },
      select: { id: true },
    });
    if (collision) {
      return { ok: false, error: "Esa imagen no está disponible." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio ?? null,
      image: parsed.data.image ?? null,
    },
  });

  // Cleanup: borrar el avatar anterior sólo si nadie más lo referencia.
  if (current?.image && current.image !== parsed.data.image) {
    const stillUsed = await prisma.user.findFirst({
      where: { image: current.image },
      select: { id: true },
    });
    if (!stillUsed) await deleteUpload(current.image);
  }

  revalidatePath("/perfil");
  revalidatePath(`/usuarios/${userId}`);
  return { ok: true };
}
