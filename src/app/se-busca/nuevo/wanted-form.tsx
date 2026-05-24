"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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

const AddressPicker = dynamic(
  () => import("@/components/address-picker").then((m) => m.AddressPicker),
  {
    ssr: false,
    loading: () => <div className="h-[300px] animate-pulse rounded-xl bg-muted" />,
  },
);

const RADII = [
  { value: "1000", label: "1 km" },
  { value: "2000", label: "2 km" },
  { value: "5000", label: "5 km" },
  { value: "10000", label: "10 km" },
];

export function WantedForm({
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
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [radius, setRadius] = useState<string>("2000");
  const [coords, setCoords] = useState({
    lat: DEFAULT_LATITUDE,
    lng: DEFAULT_LONGITUDE,
  });
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
    const maxNum = maxPrice.trim() === "" ? null : Number(maxPrice);
    const res = await fetch("/api/wanted-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        category,
        maxPricePerDay: maxNum,
        latitude: coords.lat,
        longitude: coords.lng,
        radiusM: Number(radius),
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "No se pudo crear la petición.");
      setLoading(false);
      return;
    }

    router.push("/dashboard?wanted=1");
    router.refresh();
  }

  return (
    <Card className="rounded-2xl">
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">¿Qué necesitas?</Label>
            <Input
              id="title"
              required
              minLength={3}
              maxLength={120}
              placeholder="Una sierra circular para el sábado"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detalles (opcional)</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Para qué la quieres, cuándo, condiciones..."
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
              <Label htmlFor="radius">Distancia máxima</Label>
              <Select value={radius} onValueChange={(v) => setRadius(v ?? "2000")}>
                <SelectTrigger id="radius" className="w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADII.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPrice">Tope de precio por día (€) — opcional</Label>
            <Input
              id="maxPrice"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              placeholder="Sin tope"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Déjalo vacío si te da igual el precio.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Centro de búsqueda</Label>
            <AddressPicker
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
            Publicar petición
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
