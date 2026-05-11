import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Megaphone, MapPin } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ITEM_CATEGORIES, type ItemCategory } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Se busca · Shareable" };
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

export default async function SeBuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const selectedCategory =
    category && (ITEM_CATEGORIES as readonly string[]).includes(category)
      ? (category as ItemCategory)
      : undefined;

  const wanted = await prisma.wantedItem.findMany({
    where: {
      status: "open",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      ...(selectedCategory ? { category: selectedCategory } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      requester: { select: { name: true, image: true } },
    },
  });

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Megaphone className="size-3.5" /> Marketplace inverso
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Se busca en tu barrio
          </h1>
          <p className="mt-1 text-muted-foreground">
            Lo que tus vecinos están pidiendo. ¿Tienes alguno guardado en casa?
          </p>
        </div>
        <Link
          href="/se-busca/nuevo"
          className={cn(buttonVariants(), "rounded-xl self-start md:self-auto")}
        >
          Crear una petición
        </Link>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/se-busca"
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            selectedCategory == null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          Todas
        </Link>
        {ITEM_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/se-busca?category=${encodeURIComponent(c)}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selectedCategory === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {c}
          </Link>
        ))}
      </nav>

      {wanted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <Megaphone className="size-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No hay peticiones todavía</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Sé el primero en pedir lo que necesitas. Tus vecinos podrían tenerlo guardado.
          </p>
          <Link
            href="/se-busca/nuevo"
            className={cn(buttonVariants(), "mt-2 rounded-xl")}
          >
            Crear la primera petición
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {wanted.map((w) => (
            <Card key={w.id} className="flex flex-col rounded-2xl shadow-sm">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-lg font-semibold tracking-tight">
                    {w.title}
                  </h3>
                  <Badge variant="secondary" className="shrink-0 rounded-full bg-secondary text-secondary-foreground">
                    {w.category}
                  </Badge>
                </div>
                {w.description && (
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {w.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="mt-auto space-y-2 text-xs">
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {radiusLabel(w.radiusM)} alrededor · {priceCap(w.maxPricePerDay ? Number(w.maxPricePerDay) : null)}
                </p>
                <p className="text-muted-foreground">
                  Publicado {formatDistanceToNow(w.createdAt, { addSuffix: true, locale: es })}
                  {w.expiresAt && ` · expira el ${format(w.expiresAt, "d 'de' MMM", { locale: es })}`}
                </p>
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="size-7">
                    {w.requester.image && <AvatarImage src={w.requester.image} alt="" />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                      {initials(w.requester.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{w.requester.name ?? "Vecino"}</span>
                </div>
                <Link
                  href={`/publicar?prefill=${encodeURIComponent(w.title)}&category=${encodeURIComponent(w.category)}`}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-xl")}
                >
                  Tengo uno
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
