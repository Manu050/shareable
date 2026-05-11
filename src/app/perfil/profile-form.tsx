"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ImageUploader } from "@/components/image-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { updateProfile } from "./actions";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function ProfileForm({
  initial,
}: {
  initial: {
    name: string;
    bio: string;
    image: string | null;
    email: string;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [image, setImage] = useState<string | null>(initial.image);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await updateProfile({ name, bio: bio || null, image });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <Card className="rounded-2xl">
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-20">
              {image && <AvatarImage src={image} alt="" />}
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {initials(name || initial.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label className="mb-1.5 block">Foto de perfil</Label>
              <ImageUploader
                value={image ? [image] : []}
                onChange={(arr) => setImage(arr[0] ?? null)}
                kind="avatars"
                max={1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              required
              minLength={2}
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Sobre ti</Label>
            <Textarea
              id="bio"
              rows={3}
              maxLength={280}
              placeholder="Una frase corta sobre ti, en qué eres bueno, qué te gusta prestar..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {bio.length}/280 caracteres.
            </p>
          </div>

          <div className="space-y-1.5 rounded-xl bg-muted/40 px-3 py-2 text-sm">
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{initial.email}</p>
            <p className="text-xs text-muted-foreground">
              No es editable. Si necesitas cambiarlo, ponte en contacto con soporte.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {done && (
            <p className="rounded-lg bg-accent/15 px-3 py-2 text-sm text-accent">
              Cambios guardados.
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/usuarios/me`}
            className="text-sm text-primary hover:underline"
          >
            Ver mi perfil público →
          </Link>
          <Button type="submit" className="rounded-xl" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
