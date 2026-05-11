import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Inbox, Megaphone, MessageCircle, ShoppingBag } from "lucide-react";
import type { RequestStatus, WantedItemStatus } from "@prisma/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

import { ReportButton } from "@/components/report-button";

import { DoubleCheckPanel } from "./double-check-panel";
import { RatingForm } from "./rating-form";
import { RequestActions } from "./request-actions";

const ACTIVE_STATUSES: RequestStatus[] = [
  "accepted",
  "handed_over_by_owner",
  "received_by_borrower",
  "in_progress",
  "returned_by_borrower",
  "received_back_by_owner",
];

function isActive(s: RequestStatus) {
  return ACTIVE_STATUSES.includes(s);
}

export const metadata = { title: "Panel · Shareable" };
export const dynamic = "force-dynamic";

function initials(name?: string | null, email?: string | null) {
  const src = name?.trim() || email?.split("@")[0] || "?";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function fmtRange(start: Date | null, end: Date | null) {
  if (!start || !end) return "Sin fechas";
  return `${format(start, "d MMM", { locale: es })} – ${format(end, "d MMM yyyy", { locale: es })}`;
}

const STATUS_LABEL: Record<RequestStatus, { label: string; tone: string }> = {
  pending: { label: "Pendiente", tone: "bg-secondary text-secondary-foreground" },
  accepted: { label: "Aceptada", tone: "bg-accent/15 text-accent" },
  rejected: { label: "Rechazada", tone: "bg-destructive/10 text-destructive" },
  handed_over_by_owner: { label: "Entregada por el dueño", tone: "bg-secondary text-secondary-foreground" },
  received_by_borrower: { label: "Recibida", tone: "bg-secondary text-secondary-foreground" },
  in_progress: { label: "En curso", tone: "bg-primary/10 text-primary" },
  returned_by_borrower: { label: "Devuelta", tone: "bg-secondary text-secondary-foreground" },
  received_back_by_owner: { label: "Recibida de vuelta", tone: "bg-secondary text-secondary-foreground" },
  completed: { label: "Finalizada", tone: "bg-accent/15 text-accent" },
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const s = STATUS_LABEL[status];
  return (
    <Badge variant="secondary" className={`rounded-full ${s.tone}`}>
      {s.label}
    </Badge>
  );
}

const WANTED_LABEL: Record<WantedItemStatus, { label: string; tone: string }> = {
  open: { label: "Abierta", tone: "bg-accent/15 text-accent" },
  fulfilled: { label: "Resuelta", tone: "bg-secondary text-secondary-foreground" },
  cancelled: { label: "Cancelada", tone: "bg-destructive/10 text-destructive" },
};

function WantedStatusBadge({ status }: { status: WantedItemStatus }) {
  const s = WANTED_LABEL[status];
  return (
    <Badge variant="secondary" className={`rounded-full ${s.tone}`}>
      {s.label}
    </Badge>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/dashboard");

  const userId = session.user.id;

  const [outgoing, incoming, wantedItems] = await Promise.all([
    prisma.request.findMany({
      where: { borrowerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            owner: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        ratings: { where: { raterUserId: userId }, select: { id: true } },
      },
    }),
    prisma.request.findMany({
      where: { item: { ownerId: userId } },
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { id: true, title: true } },
        borrower: { select: { id: true, name: true, email: true, image: true } },
        ratings: { where: { raterUserId: userId }, select: { id: true } },
      },
    }),
    prisma.wantedItem.findMany({
      where: { requesterId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            matches: {
              where: { seenAt: null, item: { isActive: true } },
            },
          },
        },
      },
    }),
  ]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-12 px-4 py-12 md:px-6 md:py-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Panel de control
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tus alquileres y solicitudes en un solo sitio.
        </p>
      </header>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <ShoppingBag className="size-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Mis alquileres</h2>
          <span className="text-sm text-muted-foreground">
            ({outgoing.length})
          </span>
        </div>

        {outgoing.length === 0 ? (
          <EmptyState
            text="Aún no has reservado nada."
            cta={{ href: "/explorar", label: "Explorar el catálogo" }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {outgoing.map((r) => (
              <Card key={r.id} className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="line-clamp-1 text-base">
                      <Link href={`/items/${r.item.id}`} className="hover:underline">
                        {r.item.title}
                      </Link>
                    </CardTitle>
                    <StatusBadge status={r.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Avatar className="size-9">
                      {r.item.owner.image && (
                        <AvatarImage src={r.item.owner.image} alt="" />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {initials(r.item.owner.name, r.item.owner.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground/90">
                        Dueño: {r.item.owner.name ?? "Vecino"}
                      </p>
                      <p className="text-muted-foreground">
                        {fmtRange(r.startDate, r.endDate)}
                      </p>
                    </div>
                  </div>
                  <DoubleCheckPanel
                    requestId={r.id}
                    status={r.status}
                    isOwner={false}
                  />
                  {isActive(r.status) && (
                    <div className="flex flex-wrap items-center gap-1">
                      <Link
                        href={`/requests/${r.id}/chat`}
                        className={cn(
                          buttonVariants({ size: "xs", variant: "ghost" }),
                          "rounded-lg text-xs",
                        )}
                      >
                        <MessageCircle className="size-3" /> Abrir chat
                      </Link>
                      <ReportButton requestId={r.id} />
                    </div>
                  )}
                  {r.status === "completed" && r.ratings.length === 0 && (
                    <RatingForm
                      requestId={r.id}
                      counterpartName={r.item.owner.name ?? "el dueño"}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="size-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Mis peticiones</h2>
          <span className="text-sm text-muted-foreground">
            ({wantedItems.length})
          </span>
          <Link
            href="/se-busca/nuevo"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "ml-auto rounded-xl",
            )}
          >
            Nueva petición
          </Link>
        </div>

        {wantedItems.length === 0 ? (
          <EmptyState
            text="No tienes peticiones abiertas. ¿Hay algo que tus vecinos podrían tener?"
            cta={{ href: "/se-busca/nuevo", label: "Pídelo al barrio" }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {wantedItems.map((w) => {
              const unseen = w._count.matches;
              return (
                <Card key={w.id} className="rounded-2xl">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="line-clamp-1 text-base">
                        <Link
                          href={`/se-busca/${w.id}`}
                          className="hover:underline"
                        >
                          {w.title}
                        </Link>
                      </CardTitle>
                      <WantedStatusBadge status={w.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{w.category}</span>
                    {w.status === "open" && unseen > 0 ? (
                      <Link
                        href={`/se-busca/${w.id}`}
                        className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                      >
                        ✨ {unseen} {unseen === 1 ? "coincidencia nueva" : "coincidencias nuevas"}
                      </Link>
                    ) : w.status === "open" ? (
                      <span className="text-xs text-muted-foreground">
                        Sin coincidencias todavía
                      </span>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <Inbox className="size-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Mis solicitudes</h2>
          <span className="text-sm text-muted-foreground">
            ({incoming.length})
          </span>
        </div>

        {incoming.length === 0 ? (
          <EmptyState
            text="Nadie te ha solicitado ningún objeto todavía."
            cta={{ href: "/publicar", label: "Publicar otro objeto" }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {incoming.map((r) => (
              <Card key={r.id} className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="line-clamp-1 text-base">
                      <Link href={`/items/${r.item.id}`} className="hover:underline">
                        {r.item.title}
                      </Link>
                    </CardTitle>
                    <StatusBadge status={r.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Avatar className="size-9">
                      {r.borrower.image && (
                        <AvatarImage src={r.borrower.image} alt="" />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {initials(r.borrower.name, r.borrower.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground/90">
                        Solicita: {r.borrower.name ?? "Vecino"}
                      </p>
                      <p className="text-muted-foreground">
                        {fmtRange(r.startDate, r.endDate)}
                      </p>
                    </div>
                  </div>

                  {r.status === "pending" && <RequestActions requestId={r.id} />}
                  <DoubleCheckPanel
                    requestId={r.id}
                    status={r.status}
                    isOwner={true}
                  />
                  {isActive(r.status) && (
                    <div className="flex flex-wrap items-center gap-1">
                      <Link
                        href={`/requests/${r.id}/chat`}
                        className={cn(
                          buttonVariants({ size: "xs", variant: "ghost" }),
                          "rounded-lg text-xs",
                        )}
                      >
                        <MessageCircle className="size-3" /> Abrir chat
                      </Link>
                      <ReportButton requestId={r.id} />
                    </div>
                  )}
                  {r.status === "completed" && r.ratings.length === 0 && (
                    <RatingForm
                      requestId={r.id}
                      counterpartName={r.borrower.name ?? "el receptor"}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState({
  text,
  cta,
}: {
  text: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link
        href={cta.href}
        className="text-sm font-medium text-primary hover:underline"
      >
        {cta.label} →
      </Link>
    </div>
  );
}
