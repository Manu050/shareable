import Link from "next/link";
import { Megaphone, PackageOpen, Tag } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ITEM_CATEGORIES, type ItemCategory } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

import { SearchBar } from "./search-bar";

export const metadata = { title: "Explorar · Shareable" };
export const dynamic = "force-dynamic";

function initials(name?: string | null, email?: string | null) {
  const src = name?.trim() || email?.split("@")[0] || "?";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function priceLabel(price: number) {
  return price === 0 ? "Gratis" : `${price.toFixed(2).replace(".", ",")} €/día`;
}

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const selectedCategory =
    category && (ITEM_CATEGORIES as readonly string[]).includes(category)
      ? (category as ItemCategory)
      : undefined;
  const query = q?.trim() ?? "";

  const where: Prisma.ItemWhereInput = { isActive: true };
  if (selectedCategory) where.category = selectedCategory;
  if (query.length > 0) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  const items = await prisma.item.findMany({
    where,
    orderBy: { id: "desc" },
    include: {
      owner: { select: { name: true, email: true, image: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
    },
  });

  const hasActiveFilters = query.length > 0 || selectedCategory != null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Explorar</h1>
          <p className="text-muted-foreground">
            Lo que comparten tus vecinos de Sanchinarro ahora mismo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start md:self-auto">
          <Link
            href="/explorar/mapa"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
          >
            Ver en el mapa
          </Link>
          <Link href="/publicar" className={cn(buttonVariants(), "rounded-xl")}>
            Publicar uno tuyo
          </Link>
        </div>
      </header>

      <div className="mb-6">
        <SearchBar />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          {hasActiveFilters ? (
            <>
              <Megaphone className="size-10 text-primary" />
              <h2 className="text-lg font-semibold">Nadie lo ha subido aún</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                {query
                  ? <>No hay objetos para <span className="font-medium text-foreground">"{query}"</span>{selectedCategory ? <> en <span className="font-medium text-foreground">{selectedCategory}</span></> : null}. ¡Pídeselo al barrio y te avisamos cuando alguien lo publique!</>
                  : <>Aún no hay objetos en <span className="font-medium text-foreground">{selectedCategory}</span>. ¡Pídeselo al barrio!</>}
              </p>
              <Link
                href={`/se-busca/nuevo${
                  query || selectedCategory
                    ? `?${[
                        query ? `prefill=${encodeURIComponent(query)}` : null,
                        selectedCategory ? `category=${encodeURIComponent(selectedCategory)}` : null,
                      ]
                        .filter(Boolean)
                        .join("&")}`
                    : ""
                }`}
                className={cn(buttonVariants(), "mt-2 rounded-xl")}
              >
                Pídelo al barrio
              </Link>
            </>
          ) : (
            <>
              <PackageOpen className="size-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Aún no hay objetos publicados</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                ¡Vaya! No hay herramientas por aquí. Sé el primero en publicar una.
              </p>
              <Link href="/publicar" className={cn(buttonVariants(), "mt-2 rounded-xl")}>
                Publicar el primero
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const price = Number(item.pricePerDay);
            const cover = item.images[0]?.url;
            return (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="block focus:outline-none"
              >
                <Card className="group flex h-full flex-col overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary/40">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary/60">
                        <PackageOpen className="size-12" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                      <Tag className="mr-1 inline size-3 -translate-y-px" />
                      {item.category}
                    </span>
                  </div>

                  <CardHeader className="space-y-1">
                    <h3 className="line-clamp-1 text-lg font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </CardHeader>

                  <CardContent className="mt-auto pt-0">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
                        price === 0
                          ? "bg-accent/15 text-accent"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {priceLabel(price)}
                    </span>
                  </CardContent>

                  <CardFooter className="flex items-center gap-2 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                    <Avatar className="size-7">
                      {item.owner.image && <AvatarImage src={item.owner.image} alt="" />}
                      <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                        {initials(item.owner.name, item.owner.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{item.owner.name ?? "Vecino"}</span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
