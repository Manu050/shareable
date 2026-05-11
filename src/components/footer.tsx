import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-card/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
        <p>
          <span className="font-semibold text-primary">Shareable</span>
          <span className="mx-2">·</span>
          Comparte con tu barrio. Sanchinarro, Madrid.
        </p>
        <nav className="flex items-center gap-5">
          <Link href="#" className="hover:text-foreground transition-colors">
            Sobre nosotros
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors">
            Privacidad
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors">
            Contacto
          </Link>
        </nav>
        <p className="text-xs">© {year} Shareable</p>
      </div>
    </footer>
  );
}
