import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { UserRowActions } from "./user-row-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Usuarios" };

function initials(name?: string | null, email?: string | null) {
  const src = name?.trim() || email?.split("@")[0] || "?";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      status: true,
      role: true,
      createdAt: true,
      _count: { select: { items: true, requestsAsBorrower: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Users className="size-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold tracking-tight">Usuarios ({users.length})</h2>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por nombre o email..."
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Buscar
        </button>
      </form>

      {users.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No hay usuarios que coincidan.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="rounded-2xl">
              <CardContent className="flex flex-wrap items-center gap-4 py-4">
                <Avatar className="size-10 shrink-0">
                  {u.image && <AvatarImage src={u.image} alt="" />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials(u.name, u.email)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.name ?? "Sin nombre"}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant="secondary"
                    className={
                      u.status === "active"
                        ? "bg-accent/15 text-accent"
                        : "bg-destructive/10 text-destructive"
                    }
                  >
                    {u.status === "active" ? "Activo" : "Suspendido"}
                  </Badge>
                  {u.role === "admin" && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">admin</Badge>
                  )}
                  <span>{u._count.items} objetos</span>
                  <span>{u._count.requestsAsBorrower} solicitudes</span>
                  <span>Registro: {format(u.createdAt, "d MMM yyyy", { locale: es })}</span>
                </div>

                <UserRowActions userId={u.id} status={u.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
