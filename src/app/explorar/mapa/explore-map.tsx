"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Locate, PackageOpen } from "lucide-react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import "@/components/map-styles";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from "@/lib/categories";

type NearbyItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  pricePerDay: number;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  distanceM: number;
  owner: { name: string | null; image: string | null };
};

const RADII = [
  { value: "0", label: "Sin filtro" },
  { value: "1000", label: "1 km" },
  { value: "3000", label: "3 km" },
  { value: "5000", label: "5 km" },
  { value: "10000", label: "10 km" },
];

function priceLabel(price: number) {
  return price === 0 ? "Gratis" : `${price.toFixed(2).replace(".", ",")} €/día`;
}

function distLabel(m: number) {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15);
  }, [center, map]);
  return null;
}

export function ExploreMap() {
  const [center, setCenter] = useState<[number, number]>([
    DEFAULT_LATITUDE,
    DEFAULT_LONGITUDE,
  ]);
  const [radius, setRadius] = useState<number>(0);
  const [items, setItems] = useState<NearbyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const load = useCallback(async (lat: number, lng: number, r: number) => {
    setLoading(true);
    const url = new URL("/api/items/nearby", window.location.origin);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));
    if (r > 0) url.searchParams.set("radius", String(r));
    try {
      const res = await fetch(url);
      const data = (await res.json()) as { items: NearbyItem[] };
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(center[0], center[1], radius);
  }, [center, radius, load]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoError(null);
        setCenter([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => setGeoError(err.message ?? "No se pudo obtener tu ubicación."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Mapa
          </h1>
          <p className="text-sm text-muted-foreground">
            Encuentra objetos cerca de ti.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/explorar"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-xl")}
          >
            Vista lista
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={useMyLocation}
          >
            <Locate className="size-4" /> Mi ubicación
          </Button>
          <Select
            value={String(radius)}
            onValueChange={(v) => setRadius(Number(v ?? "0"))}
          >
            <SelectTrigger className="w-[140px] rounded-xl">
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
      </header>

      {geoError && (
        <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {geoError}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
        <MapContainer
          center={center}
          zoom={15}
          style={{ height: "70vh", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter center={center} />

          {radius > 0 && (
            <Circle
              center={center}
              radius={radius}
              pathOptions={{
                color: "#E36A6A",
                fillColor: "#FFB2B2",
                fillOpacity: 0.15,
                weight: 1.5,
              }}
            />
          )}

          {items.map((it) => (
            <Marker key={it.id} position={[it.latitude, it.longitude]}>
              <Popup>
                <div className="w-56 space-y-2">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-secondary/30">
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.imageUrl}
                        alt={it.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary/60">
                        <PackageOpen className="size-8" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">{it.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.category} · {priceLabel(it.pricePerDay)} ·{" "}
                      {distLabel(it.distanceM)}
                    </p>
                  </div>
                  <Link
                    href={`/items/${it.id}`}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "w-full rounded-lg",
                    )}
                  >
                    Ver detalle
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {loading
          ? "Cargando objetos..."
          : `${items.length} objeto${items.length === 1 ? "" : "s"} en el área.`}
      </p>
    </section>
  );
}
