import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditItemForm } from "./edit-item-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar objeto · Shareable" };

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/items/${id}/editar`);
  }

  const item = await prisma.item.findUnique({
    where: { id },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!item || !item.isActive || item.ownerId !== session.user.id) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Editar objeto</h1>
        <p className="text-muted-foreground">Actualiza los detalles de tu anuncio.</p>
      </header>
      <EditItemForm
        item={{
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          pricePerDay: Number(item.pricePerDay),
          latitude: item.latitude,
          longitude: item.longitude,
          images: item.images.map((i) => i.url),
        }}
      />
    </section>
  );
}
