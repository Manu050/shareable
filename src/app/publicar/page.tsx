import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { PublishForm } from "./publish-form";

export const metadata = {
  title: "Publicar un objeto · Shareable",
};

export default async function PublicarPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/publicar");
  }
  const { prefill, category } = await searchParams;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Publicar un objeto
        </h1>
        <p className="text-muted-foreground">
          Comparte una herramienta o un objeto con tus vecinos. Tardas un minuto.
        </p>
      </header>
      <PublishForm prefill={prefill} category={category} />
    </section>
  );
}
