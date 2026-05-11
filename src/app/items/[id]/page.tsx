import { notFound } from "next/navigation";
import Link from "next/link";
import { PackageOpen, Tag, MapPin } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { BookingPanel } from "./booking-panel";
import { ImageGallery } from "./image-gallery";

export const dynamic = "force-dynamic";

function priceLabel(price: number) {
  return price === 0 ? "Gratis" : `${price.toFixed(2).replace(".", ",")} €/día`;
}

function initials(name?: string | null, email?: string | null) {
  const src = name?.trim() || email?.split("@")[0] || "?";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      images: { orderBy: { position: "asc" } },
    },
  });
  if (!item || !item.isActive) notFound();

  const isOwner = session?.user?.id === item.owner.id;
  const price = Number(item.pricePerDay);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="relative">
            <ImageGallery
              images={item.images.map((i) => ({ id: i.id, url: i.url }))}
              alt={item.title}
            />
            <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
              <Tag className="size-3" /> {item.category}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {item.title}
            </h1>
            <p
              className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-base font-semibold ${
                price === 0
                  ? "bg-accent/15 text-accent"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {priceLabel(price)}
            </p>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Descripción</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {item.description}
            </CardContent>
          </Card>

          <Link
            href={`/usuarios/${item.owner.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:bg-card/60"
          >
            <Avatar className="size-10">
              {item.owner.image && <AvatarImage src={item.owner.image} alt="" />}
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {initials(item.owner.name, item.owner.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Lo comparte</p>
              <p className="truncate font-medium">
                {item.owner.name ?? "Vecino de Sanchinarro"}
              </p>
            </div>
          </Link>

          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4" /> Sanchinarro, Madrid
          </p>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {session?.user ? (
            isOwner ? (
              <Card className="rounded-2xl">
                <CardContent className="space-y-2 py-6">
                  <p className="font-medium">Este objeto es tuyo.</p>
                  <p className="text-sm text-muted-foreground">
                    Verás aquí las solicitudes de tus vecinos en tu{" "}
                    <Link href="/dashboard" className="text-primary hover:underline">
                      panel de control
                    </Link>
                    .
                  </p>
                </CardContent>
              </Card>
            ) : (
              <BookingPanel itemId={item.id} pricePerDay={price} />
            )
          ) : (
            <Card className="rounded-2xl">
              <CardContent className="space-y-3 py-6 text-sm">
                <p className="font-medium">Inicia sesión para reservar.</p>
                <Link
                  href={`/auth/login?callbackUrl=/items/${item.id}`}
                  className="text-primary hover:underline"
                >
                  Entrar a Shareable →
                </Link>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </section>
  );
}
