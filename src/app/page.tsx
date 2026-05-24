import Image from "next/image";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const session = await auth();

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-16 text-center md:px-6 md:py-28">
      {/* Brand mark */}
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/assets/logo.png"
          alt="Shareable"
          width={80}
          height={80}
          className="size-20 drop-shadow-sm"
          priority
        />
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          MVP · Sanchinarro, Madrid
        </span>
      </div>

      {session?.user ? (
        <>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Hola, <span className="text-primary">{session.user.name ?? session.user.email}</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Ya estás dentro. Explora lo que tus vecinos comparten o publica un objeto tuyo.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/explorar" className={cn(buttonVariants(), "rounded-xl")}>
              Explorar objetos
            </Link>
            <Link
              href="/publicar"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
            >
              Publicar uno tuyo
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Comparte herramientas<br className="hidden sm:block" /> con tu barrio.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Shareable conecta vecinos para prestar y alquilar objetos de uso ocasional.
            Menos consumo, más comunidad.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/auth/register" className={cn(buttonVariants(), "rounded-xl")}>
              Crear cuenta gratis
            </Link>
            <Link
              href="/auth/login"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
            >
              Entrar
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Plataforma 100% gratuita · Sin comisiones · Pago en persona
          </p>
        </>
      )}
    </section>
  );
}
