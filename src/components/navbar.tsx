"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, LogOut, User as UserIcon, Wrench } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/explorar", label: "Explorar" },
  { href: "/se-busca", label: "Se busca" },
  { href: "/publicar", label: "Publicar" },
] as const;

function initialsOf(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "?";
  const parts = source.split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const user = session?.user;
  const isAuthed = status === "authenticated";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-2xl font-semibold tracking-tight text-primary">
          Shareable
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}

          {isAuthed ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 rounded-full"
                    aria-label="Abrir menú de usuario"
                  >
                    <Avatar className="size-8">
                      {user?.image && <AvatarImage src={user.image} alt="" />}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {initialsOf(user?.name, user?.email).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <div className="flex flex-col px-2 py-1.5">
                  <span className="text-sm font-medium">{user?.name ?? "Usuario"}</span>
                  <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem render={<Link href="/perfil" />}>
                    <UserIcon className="size-4" /> Mi perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/dashboard" />}>
                    <Wrench className="size-4" /> Mis productos
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link
                href="/auth/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "rounded-xl",
                )}
              >
                Entrar
              </Link>
              <Link
                href="/auth/register"
                className={cn(buttonVariants({ size: "sm" }), "rounded-xl")}
              >
                Crear cuenta
              </Link>
            </div>
          )}
        </nav>

        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Abrir menú" className="rounded-xl">
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="right" className="w-72 bg-background">
              <SheetHeader>
                <SheetTitle className="text-xl font-semibold tracking-tight text-primary">
                  Shareable
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1 px-4 pb-6">
                <Link
                  href="/explorar"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-foreground/90 transition-colors hover:bg-muted"
                >
                  Explorar
                </Link>
                <Link
                  href="/se-busca"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-foreground/90 transition-colors hover:bg-muted"
                >
                  Se busca
                </Link>
                <Link
                  href="/publicar"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-foreground/90 transition-colors hover:bg-muted"
                >
                  Publicar
                </Link>

                {isAuthed ? (
                  <>
                    <Link
                      href="/perfil"
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-3 py-3 text-base font-medium text-foreground/90 transition-colors hover:bg-muted"
                    >
                      Mi perfil
                    </Link>
                    <Link
                      href="#"
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-3 py-3 text-base font-medium text-foreground/90 transition-colors hover:bg-muted"
                    >
                      Mis productos
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="rounded-xl px-3 py-3 text-left text-base font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setOpen(false)}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "mt-3 rounded-xl",
                      )}
                    >
                      Entrar
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={() => setOpen(false)}
                      className={cn(buttonVariants(), "rounded-xl")}
                    >
                      Crear cuenta
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
