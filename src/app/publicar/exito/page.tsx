import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "¡Publicado! · Shareable",
};

export default function PublicarExitoPage() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 md:py-24">
      <Card className="w-full rounded-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent">
            <CheckCircle2 className="size-8" />
          </div>
          <CardTitle className="text-2xl tracking-tight">
            ¡Tu objeto ya está publicado!
          </CardTitle>
          <CardDescription>
            Tus vecinos de Sanchinarro ya pueden encontrarlo en Explorar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/explorar" className={cn(buttonVariants(), "rounded-xl")}>
            Ver el catálogo
          </Link>
          <Link
            href="/publicar"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
          >
            Publicar otro
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
