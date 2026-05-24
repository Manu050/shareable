"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Locate, PackageOpen } from "lucide-react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import {
  TILE_ATTRIBUTION,
  TILE_MAX_ZOOM,
  TILE_SUBDOMAINS,
  TILE_URL,
  priceMarker,
} from "@/components/map-styles";
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

// Etiqueta corta para el marker: "5€" / "12€" / "Gratis". Cabe en 36×36 px.
function shortPrice(price: number): string {
  if (price === 0) return "Gratis";
  return `${Math.round(price)}€`;
}

function distLabel(m: number) {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      map.setView(center, 15);
    } else {
      map.flyTo(center, 15);
    }
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
    // Sync con el endpoint /api/items/nearby: refetch cuando el centro o el
    // radio cambian. El setState dentro de `load` es para loading UI — no
    // alimenta nada en este mismo árbol de efectos.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Memoizo los icons por item para que un re-render del componente no
  // recree 200 divIcons (sería costoso y haría que Leaflet repintara markers).
  const icons = useMemo(
    () => new Map(items.map((it) => [it.id, priceMarker(shortPrice(it.pricePerDay), it.pricePerDay === 0)])),
    [items],
  );

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
        <p role="alert" className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
            attribution={TILE_ATTRIBUTION}
            url={TILE_URL}
            subdomains={TILE_SUBDOMAINS}
            maxZoom={TILE_MAX_ZOOM}
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
            <Marker
              key={it.id}
              position={[it.latitude, it.longitude]}
              icon={icons.get(it.id)}
            >
              <Popup closeButton={true} maxWidth={260} minWidth={240}>
                <article className="w-full">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary/30">
                    {it.imageUrl ? (
                      <Image
                        src={it.imageUrl}
                        alt={it.title}
                        fill
                        sizes="240px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary/60">
                        <PackageOpen className="size-10" />
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
                      {it.category}
                    </span>
                  </div>

                  <div className="space-y-2 px-3 py-3">
                    <h3 className="line-clamp-1 text-sm font-semibold leading-tight">
                      {it.title}
                    </h3>

                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                          it.pricePerDay === 0
                            ? "bg-accent/15 text-accent"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {priceLabel(it.pricePerDay)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {distLabel(it.distanceM)} de aquí
                      </span>
                    </div>

                    <Link
                      href={`/items/${it.id}`}
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "mt-1 w-full rounded-lg",
                      )}
                    >
                      Ver detalle
                    </Link>
                  </div>
                </article>
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
