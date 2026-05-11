import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Inbox } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

import { ReportRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

function initials(name?: string | null) {
  const src = name?.trim() || "?";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const showResolved = filter === "resolved";

  const reports = await prisma.report.findMany({
    where: { isResolved: showResolved },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      reporter: { select: { id: true, name: true, email: true, image: true, status: true } },
      request: {
        select: {
          id: true,
          status: true,
          item: {
            select: {
              id: true,
              title: true,
              owner: { select: { id: true, name: true, email: true, status: true } },
            },
          },
          borrower: { select: { id: true, name: true, email: true, status: true } },
        },
      },
    },
  });

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Reportes {showResolved ? "resueltos" : "abiertos"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Revisa los problemas reportados por vecinos en transacciones activas.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/reports"
            className={cn(
              "rounded-lg px-3 py-1.5 transition-colors",
              !showResolved
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-muted",
            )}
          >
            Abiertos
          </Link>
          <Link
            href="/admin/reports?filter=resolved"
            className={cn(
              "rounded-lg px-3 py-1.5 transition-colors",
              showResolved
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-muted",
            )}
          >
            Resueltos
          </Link>
        </div>
      </header>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <Inbox className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No hay reportes {showResolved ? "resueltos" : "abiertos"}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const otherParty =
              r.reporter.id === r.request.item.owner.id
                ? r.request.borrower
                : r.request.item.owner;
            return (
              <Card key={r.id} className="rounded-2xl">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        {r.reporter.image && (
                          <AvatarImage src={r.reporter.image} alt="" />
                        )}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {initials(r.reporter.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {r.reporter.name ?? "Vecino"}{" "}
                          <span className="text-muted-foreground">reporta</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(r.createdAt, "d 'de' MMM yyyy · HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.isResolved ? (
                        <Badge className="rounded-full bg-accent/15 text-accent">Resuelto</Badge>
                      ) : (
                        <Badge className="rounded-full bg-destructive/10 text-destructive">
                          Abierto
                        </Badge>
                      )}
                      <Link
                        href={`/items/${r.request.item.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "rounded-lg",
                        )}
                      >
                        Ver objeto
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                    {r.reason}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Objeto / dueño
                      </p>
                      <p className="font-medium">{r.request.item.title}</p>
                      <p className="text-muted-foreground">
                        {r.request.item.owner.name ?? r.request.item.owner.email}
                        {r.request.item.owner.status === "suspended" && (
                          <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                            suspendido
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Receptor
                      </p>
                      <p className="font-medium">
                        {r.request.borrower.name ?? r.request.borrower.email}
                        {r.request.borrower.status === "suspended" && (
                          <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                            suspendido
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        Estado del préstamo: {r.request.status}
                      </p>
                    </div>
                  </div>

                  <ReportRowActions
                    reportId={r.id}
                    isResolved={r.isResolved}
                    otherPartyId={otherParty.id}
                    otherPartyName={otherParty.name ?? otherParty.email}
                    otherPartySuspended={otherParty.status === "suspended"}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
