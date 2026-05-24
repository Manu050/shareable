import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin · Shareable" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/admin/reports");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  // 404 deliberado: no exponemos la existencia del backoffice a no-admins.
  if (me?.role !== "admin") {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <ShieldAlert className="size-4 text-destructive" />
          <span className="font-semibold">Panel admin</span>
          <span className="text-muted-foreground">· Shareable</span>
        </div>
        <nav className="flex gap-1 text-sm">
          <Link href="/admin/reports" className="rounded-lg px-3 py-1.5 hover:bg-muted">
            Reportes
          </Link>
          <Link href="/admin/usuarios" className="rounded-lg px-3 py-1.5 hover:bg-muted">
            Usuarios
          </Link>
          <Link href="/admin/se-busca" className="rounded-lg px-3 py-1.5 hover:bg-muted">
            Se busca
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
