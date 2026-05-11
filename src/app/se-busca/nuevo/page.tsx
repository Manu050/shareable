import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { WantedForm } from "./wanted-form";

export const metadata = { title: "Pídelo al barrio · Shareable" };

export default async function NuevaPeticionPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/se-busca/nuevo");
  }
  const { prefill, category } = await searchParams;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Pídelo al barrio
        </h1>
        <p className="text-muted-foreground">
          Cuéntale a Sanchinarro qué necesitas. Si alguien lo publica, te avisamos.
        </p>
      </header>
      <WantedForm prefill={prefill} category={category} />
    </section>
  );
}
