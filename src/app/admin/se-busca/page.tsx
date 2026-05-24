import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

import { WantedAdminActions } from "./wanted-admin-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Se Busca" };

function radiusLabel(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(0)} km` : `${m} m`;
}

const STATUS_MAP = {
  open: { label: "Abierta", cls: "bg-accent/15 text-accent" },
  fulfilled: { label: "Resuelta", cls: "bg-secondary text-secondary-foreground" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/10 text-destructive" },
};

export default async function AdminSeBuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter, q } = await searchParams;
  const query = q?.trim() ?? "";
  const statusFilter = filter === "closed" ? ["fulfilled", "cancelled"] : ["open"];

  const items = await prisma.wantedItem.findMany({
    where: {
      status: { in: statusFilter as ("open" | "fulfilled" | "cancelled")[] },
      ...(query
        ? { title: { contains: query, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      _count: { select: { matches: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Search className="size-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold tracking-tight">Se Busca ({items.length})</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/se-busca"
          className={cn(
            buttonVariants({ variant: filter !== "closed" ? "default" : "outline", size: "sm" }),
            "rounded-xl",
          )}
        >
          Abiertas
        </Link>
        <Link
          href="/admin/se-busca?filter=closed"
          className={cn(
            buttonVariants({ variant: filter === "closed" ? "default" : "outline", size: "sm" }),
            "rounded-xl",
          )}
        >
          Cerradas
        </Link>
        <form method="GET" className="ml-auto flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar título..."
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {filter && <input type="hidden" name="filter" value={filter} />}
          <button
            type="submit"
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Buscar
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No hay peticiones que coincidan.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((w) => {
            const badge = STATUS_MAP[w.status];
            return (
              <Card key={w.id} className="rounded-2xl">
                <CardContent className="flex flex-wrap items-start gap-4 py-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className={`rounded-full text-xs ${badge.cls}`}>
                        {badge.label}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full text-xs">
                        {w.category}
                      </Badge>
                    </div>
                    <p className="font-medium line-clamp-1">{w.title}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>
                        Por{" "}
                        <Link href={`/usuarios/${w.requester.id}`} className="text-foreground hover:underline">
                          {w.requester.name ?? w.requester.email}
                        </Link>
                      </span>
                      <span>Radio: {radiusLabel(w.radiusM)}</span>
                      <span>{w._count.matches} coincidencias</span>
                      <span>
                        Creada {formatDistanceToNow(w.createdAt, { addSuffix: true, locale: es })}
                      </span>
                      {w.expiresAt && (
                        <span>
                          Expira {format(w.expiresAt, "d MMM yyyy", { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>

                  <WantedAdminActions wantedId={w.id} status={w.status} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
