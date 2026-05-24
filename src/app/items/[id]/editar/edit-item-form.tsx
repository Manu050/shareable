"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import { ITEM_CATEGORIES } from "@/lib/categories";

const AddressPicker = dynamic(
  () => import("@/components/address-picker").then((m) => m.AddressPicker),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-xl bg-muted" /> },
);

type Props = {
  item: {
    id: string;
    title: string;
    description: string;
    category: string;
    pricePerDay: number;
    latitude: number;
    longitude: number;
    images: string[];
  };
};

export function EditItemForm({ item }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [category, setCategory] = useState(item.category);
  const [pricePerDay, setPricePerDay] = useState(String(item.pricePerDay));
  const [coords, setCoords] = useState({ lat: item.latitude, lng: item.longitude });
  // Start with existing images; user can remove or add.
  const [images, setImages] = useState<string[]>(item.images);
  const [originalImages] = useState<string[]>(item.images);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("Elige una categoría.");
      return;
    }

    // Split images into "kept originals" and "new uploads"
    const originalSet = new Set(originalImages);
    const keepImages = images.filter((url) => originalSet.has(url));
    const newImages = images.filter((url) => !originalSet.has(url));

    setLoading(true);
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        pricePerDay: Number(pricePerDay) || 0,
        latitude: coords.lat,
        longitude: coords.lng,
        keepImages,
        newImages,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "No se pudo guardar.");
      setLoading(false);
      return;
    }

    router.push(`/items/${item.id}`);
    router.refresh();
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
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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
              initialCoords={{ lat: item.latitude, lng: item.longitude }}
              onChange={({ lat, lng }) => setCoords({ lat, lng })}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
            Guardar cambios
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
