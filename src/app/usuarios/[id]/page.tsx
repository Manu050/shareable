import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MessageCircle, PackageOpen } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { StarsDisplay } from "@/components/star-rating";
import { SendMessageButton } from "@/components/send-message-button";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function initials(name?: string | null, email?: string | null) {
  const src = name?.trim() || email?.split("@")[0] || "?";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function priceLabel(price: number) {
  return price === 0 ? "Gratis" : `${price.toFixed(2).replace(".", ",")} €/día`;
}

export default async function UsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id: rawId }, session] = await Promise.all([params, auth()]);

  // Soporta /usuarios/me como atajo a la sesión actual.
  const userId = rawId === "me" ? session?.user?.id : rawId;
  if (!userId) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      createdAt: true,
      status: true,
    },
  });
  if (!user) notFound();

  const [agg, items, reviews] = await Promise.all([
    prisma.userRating.aggregate({
      where: { ratedUserId: userId },
      _avg: { stars: true },
      _count: { stars: true },
    }),
    prisma.item.findMany({
      where: { ownerId: userId, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
    prisma.userRating.findMany({
      where: { ratedUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        rater: { select: { id: true, name: true, image: true } },
      },
    }),
  ]);

  const avg = agg._avg.stars ?? 0;
  const total = agg._count.stars;
  const isMe = session?.user?.id === user.id;

  return (
    <section className="mx-auto w-full max-w-5xl space-y-10 px-4 py-12 md:px-6 md:py-16">
      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar className="size-24">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
            {initials(user.name, user.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {user.name ?? "Vecino de Sanchinarro"}
            </h1>
            {user.status === "suspended" && (
              <Badge className="rounded-full bg-destructive/10 text-destructive">
                Suspendido
              </Badge>
            )}
            {isMe ? (
              <Link
                href="/perfil"
                className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-muted"
              >
                Editar mi perfil
              </Link>
            ) : session?.user?.id ? (
              <SendMessageButton targetUserId={user.id} />
            ) : (
              <Link
                href={`/auth/login?callbackUrl=/usuarios/${user.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-muted"
              >
                <MessageCircle className="size-3.5" />
                Enviar mensaje
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StarsDisplay value={avg} />
            <span>
              {total === 0
                ? "Sin valoraciones aún"
                : `${avg.toFixed(1)} · ${total} valoración${total === 1 ? "" : "es"}`}
            </span>
            <span>·</span>
            <span>
              En Shareable desde{" "}
              {formatDistanceToNow(user.createdAt, { addSuffix: false, locale: es })}
            </span>
          </div>
          {user.bio && (
            <p className="max-w-xl text-foreground/90">{user.bio}</p>
          )}
        </div>
      </header>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Lo que comparte ({items.length})
        </h2>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
            Aún no ha publicado nada.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const cover = it.images[0]?.url;
              const price = Number(it.pricePerDay);
              return (
                <Link key={it.id} href={`/items/${it.id}`}>
                  <Card className="group h-full overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-md">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary/40">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={it.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary/60">
                          <PackageOpen className="size-10" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="space-y-1">
                      <h3 className="line-clamp-1 text-base font-semibold tracking-tight">
                        {it.title}
                      </h3>
                    </CardHeader>
                    <CardFooter className="pt-0">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                          price === 0
                            ? "bg-accent/15 text-accent"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {priceLabel(price)}
                      </span>
                    </CardFooter>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Valoraciones ({total})
        </h2>
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
            Aún nadie ha valorado a {user.name?.split(" ")[0] ?? "este vecino"}.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((rv) => (
              <Card key={rv.id} className="rounded-2xl">
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8">
                      {rv.rater.image && <AvatarImage src={rv.rater.image} alt="" />}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {initials(rv.rater.name)}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      href={`/usuarios/${rv.rater.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {rv.rater.name ?? "Vecino"}
                    </Link>
                    <span className="ml-auto">
                      <StarsDisplay value={rv.stars} size="size-3.5" />
                    </span>
                  </div>
                  {rv.comment && (
                    <p className="text-sm text-foreground/90">{rv.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(rv.createdAt, { addSuffix: true, locale: es })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
