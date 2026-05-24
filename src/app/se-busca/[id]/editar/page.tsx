import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditWantedForm } from "./edit-wanted-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar petición · Shareable" };

export default async function EditWantedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/se-busca/${id}/editar`);
  }

  const wanted = await prisma.wantedItem.findUnique({ where: { id } });
  if (!wanted || wanted.requesterId !== session.user.id || wanted.status !== "open") {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Editar petición</h1>
        <p className="text-muted-foreground">Actualiza los detalles de lo que buscas.</p>
      </header>
      <EditWantedForm
        wanted={{
          id: wanted.id,
          title: wanted.title,
          description: wanted.description ?? "",
          category: wanted.category,
          maxPricePerDay: wanted.maxPricePerDay ? Number(wanted.maxPricePerDay) : null,
          radiusM: wanted.radiusM,
          latitude: wanted.latitude,
          longitude: wanted.longitude,
        }}
      />
    </section>
  );
}
