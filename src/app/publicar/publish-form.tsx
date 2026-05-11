"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { ImageUploader } from "@/components/image-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE, ITEM_CATEGORIES } from "@/lib/categories";

// Leaflet usa `window`, así que cargamos el picker solo en cliente.
const AddressPicker = dynamic(
  () => import("@/components/address-picker").then((m) => m.AddressPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] animate-pulse rounded-xl bg-muted" />
    ),
  },
);

export function PublishForm({
  prefill,
  category: prefillCategory,
}: {
  prefill?: string;
  category?: string;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(prefill ?? "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(
    (prefillCategory && (ITEM_CATEGORIES as readonly string[]).includes(prefillCategory)
      ? prefillCategory
      : "") as string,
  );
  const [pricePerDay, setPricePerDay] = useState<string>("0");
  const [coords, setCoords] = useState({
    lat: DEFAULT_LATITUDE,
    lng: DEFAULT_LONGITUDE,
  });
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("Elige una categoría.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        pricePerDay: Number(pricePerDay) || 0,
        latitude: coords.lat,
        longitude: coords.lng,
        images,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "No se pudo publicar.");
      setLoading(false);
      return;
    }

    const { item } = (await res.json()) as { item: { id: string } };
    router.push(`/publicar/exito?id=${item.id}`);
  }

  return (
    <Card className="rounded-2xl">
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              required
              minLength={3}
              maxLength={120}
              placeholder="Taladro percutor Bosch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              required
              minLength={10}
              rows={4}
              placeholder="Estado, accesorios incluidos, condiciones de uso..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
                <SelectTrigger id="category" className="w-full rounded-lg">
                  <SelectValue placeholder="Elige una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Precio por día (€)</Label>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Pon <span className="font-medium text-foreground">0</span> si lo prestas gratis.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fotos del objeto</Label>
            <ImageUploader value={images} onChange={setImages} kind="items" />
          </div>

          <div className="space-y-2">
            <Label>Ubicación</Label>
            <AddressPicker
              onChange={({ lat, lng }) => setCoords({ lat, lng })}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" className="rounded-xl" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Publicar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
