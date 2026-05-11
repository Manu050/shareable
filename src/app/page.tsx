import Link from "next/link";

import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const session = await auth();

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 md:px-6 md:py-24">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        MVP · Sanchinarro
      </span>

      {session?.user ? (
        <>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Hola, <span className="text-primary">{session.user.name ?? session.user.email}</span> 👋
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Ya estás dentro. Explora lo que tus vecinos comparten o publica un objeto tuyo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="#" className={cn(buttonVariants(), "rounded-xl")}>
              Explorar objetos
            </Link>
            <Link
              href="#"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
            >
              Publicar uno tuyo
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Comparte herramientas con tu barrio.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Shareable conecta vecinos para prestar y alquilar objetos de uso ocasional.
            Menos consumo, más comunidad.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/register" className={cn(buttonVariants(), "rounded-xl")}>
              Crear cuenta
            </Link>
            <Link
              href="/auth/login"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
            >
              Entrar
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
