import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, MapPin, PackageOpen, XCircle, CalendarPlus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { WantedActions } from "./wanted-actions";

export const dynamic = "force-dynamic";

function initials(name?: string | null) {
  const src = name?.trim() || "?";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function priceCap(v: number | null) {
  if (v == null) return "Sin tope";
  if (v === 0) return "Solo gratis";
  return `Hasta ${v.toFixed(2).replace(".", ",")} €/día`;
}

function radiusLabel(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(0)} km` : `${m} m`;
}

export default async function WantedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);

  const wanted = await prisma.wantedItem.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, image: true } },
    },
  });
  if (!wanted) notFound();

  const isOwner = session?.user?.id === wanted.requester.id;

  // Solo el requester ve los matches.
  const matches = isOwner
    ? await prisma.wantedItemMatch.findMany({
        where: { wantedItemId: wanted.id, item: { isActive: true } },
        orderBy: { createdAt: "desc" },
        include: {
          item: {
            select: {
              id: true,
              title: true,
              category: true,
              pricePerDay: true,
              owner: { select: { name: true, image: true } },
              images: { orderBy: { position: "asc" }, take: 1 },
            },
          },
        },
      })
    : [];

  if (isOwner && matches.some((m) => !m.seenAt)) {
    // Marcamos como vistos. Side-effect ligero, idempotente.
    await prisma.wantedItemMatch.updateMany({
      where: { wantedItemId: wanted.id, seenAt: null },
      data: { seenAt: new Date() },
    });
  }

  const statusBadge =
    wanted.status === "open"
      ? { label: "Abierta", tone: "bg-accent/15 text-accent" }
      : wanted.status === "fulfilled"
        ? { label: "Resuelta", tone: "bg-secondary text-secondary-foreground" }
        : { label: "Cancelada", tone: "bg-destructive/10 text-destructive" };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8 px-4 py-12 md:px-6 md:py-16">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full bg-secondary text-secondary-foreground">
            {wanted.category}
          </Badge>
          <Badge variant="secondary" className={`rounded-full ${statusBadge.tone}`}>
            {statusBadge.label}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {wanted.title}
        </h1>
        {wanted.description && (
          <p className="whitespace-pre-line text-foreground/90">{wanted.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" /> {radiusLabel(wanted.radiusM)} alrededor de Sanchinarro
          </span>
          <span>
            {priceCap(wanted.maxPricePerDay ? Number(wanted.maxPricePerDay) : null)}
          </span>
          <span>
            Publicada {formatDistanceToNow(wanted.createdAt, { addSuffix: true, locale: es })}
          </span>
          {wanted.expiresAt && (
            <span>Expira el {format(wanted.expiresAt, "d 'de' MMM yyyy", { locale: es })}</span>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Avatar className="size-9">
            {wanted.requester.image && <AvatarImage src={wanted.requester.image} alt="" />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials(wanted.requester.name)}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">
            Lo pide <span className="font-medium text-foreground">{wanted.requester.name ?? "un vecino"}</span>
          </p>
        </div>
      </header>

      {isOwner ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <WantedActions wantedId={wanted.id} status={wanted.status} isOwner={isOwner} />
            <span className="text-xs text-muted-foreground">
              <CalendarPlus className="mr-1 inline size-3.5 -translate-y-px" />
              &ldquo;Prorrogar&rdquo; añade 30 días más a la caducidad.
            </span>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-semibold tracking-tight">
              Coincidencias ({matches.length})
            </h2>

            {matches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
                Aún no hay coincidencias. Te avisaremos aquí en cuanto un vecino publique algo que encaje.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {matches.map((m) => {
                  const it = m.item;
                  const price = Number(it.pricePerDay);
                  const cover = it.images[0]?.url;
                  return (
                    <Card key={m.id} className="rounded-2xl">
                      <CardHeader className="flex flex-row items-start gap-3">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-secondary/40">
                          {cover ? (
                            <Image
                              src={cover}
                              alt={it.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-primary/60">
                              <PackageOpen className="size-7" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="line-clamp-1 text-base">{it.title}</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {it.category} · {price === 0 ? "Gratis" : `${price.toFixed(2).replace(".", ",")} €/día`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            por {it.owner.name ?? "un vecino"}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Link
                          href={`/items/${it.id}`}
                          className={cn(buttonVariants({ size: "sm" }), "w-full rounded-xl")}
                        >
                          Ver detalle
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : session?.user ? (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/40 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 text-accent" />
          <div>
            <p className="font-medium">¿Tienes uno guardado en casa?</p>
            <p className="mt-1 text-muted-foreground">
              Publícalo y le llegará automáticamente a {wanted.requester.name ?? "este vecino"}.
            </p>
            <Link
              href={`/publicar?prefill=${encodeURIComponent(wanted.title)}&category=${encodeURIComponent(wanted.category)}`}
              className={cn(buttonVariants({ size: "sm" }), "mt-3 rounded-xl")}
            >
              Tengo uno · publicarlo
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/40 p-4 text-sm">
          <XCircle className="mt-0.5 size-5 text-muted-foreground" />
          <div>
            <p>
              Inicia sesión para responder a esta petición.{" "}
              <Link
                href={`/auth/login?callbackUrl=/se-busca/${wanted.id}`}
                className="font-medium text-primary hover:underline"
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
