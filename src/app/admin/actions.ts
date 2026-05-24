"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Result = { ok: true } | { ok: false; error: string };

type AdminGuard = { error: string } | { userId: string };

// Comprueba que el usuario de la sesión es admin (lookup en BD, sin trust en JWT).
async function requireAdmin(): Promise<AdminGuard> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "No autenticado." };
  }
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "admin") {
    return { error: "Solo administradores." };
  }
  return { userId: session.user.id };
}

export async function resolveReport(reportId: string): Promise<Result> {
  const g = await requireAdmin();
  if ("error" in g) return { ok: false, error: g.error };

  await prisma.report.update({
    where: { id: reportId },
    data: { isResolved: true },
  });
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function reopenReport(reportId: string): Promise<Result> {
  const g = await requireAdmin();
  if ("error" in g) return { ok: false, error: g.error };

  await prisma.report.update({
    where: { id: reportId },
    data: { isResolved: false },
  });
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function suspendUser(userId: string): Promise<Result> {
  const g = await requireAdmin();
  if ("error" in g) return { ok: false, error: g.error };
  // Salvaguarda: que un admin no se suspenda a sí mismo (caos de UX).
  if (g.userId === userId) {
    return { ok: false, error: "No puedes suspender tu propia cuenta." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "suspended" },
  });
  revalidatePath("/admin/reports");
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function reactivateUser(userId: string): Promise<Result> {
  const g = await requireAdmin();
  if ("error" in g) return { ok: false, error: g.error };

  await prisma.user.update({
    where: { id: userId },
    data: { status: "active" },
  });
  revalidatePath("/admin/reports");
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function cancelWantedItem(wantedItemId: string): Promise<Result> {
  const g = await requireAdmin();
  if ("error" in g) return { ok: false, error: g.error };

  const exists = await prisma.wantedItem.findUnique({
    where: { id: wantedItemId },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "Petición no encontrada." };

  await prisma.wantedItem.update({
    where: { id: wantedItemId },
    data: { status: "cancelled" },
  });
  revalidatePath("/admin/se-busca");
  return { ok: true };
}
