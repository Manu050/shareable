import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { ProfileForm } from "./profile-form";

export const metadata = { title: "Mi perfil · Shareable" };
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/perfil");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, bio: true },
  });
  if (!me) redirect("/auth/login");

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Mi perfil</h1>
        <p className="text-muted-foreground">
          Esto es lo que verán tus vecinos cuando interactúen contigo.
        </p>
      </header>
      <ProfileForm
        initial={{
          name: me.name ?? "",
          bio: me.bio ?? "",
          image: me.image ?? null,
          email: me.email,
        }}
      />
    </section>
  );
}
