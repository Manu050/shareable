"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import {
  TILE_ATTRIBUTION,
  TILE_MAX_ZOOM,
  TILE_SUBDOMAINS,
  TILE_URL,
} from "@/components/map-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from "@/lib/categories";

type Coords = { lat: number; lng: number };

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

function MapMover({ center }: { center: Coords }) {
  const map = useMap();
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.setView([center.lat, center.lng], 16, { animate: !reduced });
  }, [center, map]);
  return null;
}

export function AddressPicker({
  onChange,
  initialCoords,
}: {
  onChange: (c: Coords & { address: string }) => void;
  initialCoords?: Coords;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<Coords>(
    initialCoords ?? { lat: DEFAULT_LATITUDE, lng: DEFAULT_LONGITUDE },
  );
  const [address, setAddress] = useState<string>("Sanchinarro, Madrid");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  function search(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // 800 ms: Nominatim TOS limita a 1 rps. Con 350 ms los typers rápidos
    // disparaban varias requests por segundo. Vamos a través de nuestro proxy
    // server-side `/api/geocode` que añade User-Agent y caché.
    debounceRef.current = setTimeout(async () => {
      if (q.trim().length < 3) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { results?: NominatimResult[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 800);
  }

  function pick(r: NominatimResult) {
    const next = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    setCoords(next);
    setAddress(r.display_name);
    setQuery(r.display_name);
    setResults([]);
    onChange({ ...next, address: r.display_name });
  }

  function resetToSanchinarro() {
    const next = { lat: DEFAULT_LATITUDE, lng: DEFAULT_LONGITUDE };
    setCoords(next);
    setAddress("Sanchinarro, Madrid");
    setQuery("");
    onChange({ ...next, address: "Sanchinarro, Madrid" });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          placeholder="Busca una dirección en Madrid..."
          className="pl-9"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}

        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-md">
            {results.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: "240px", width: "100%" }}
        >
          <TileLayer
            attribution={TILE_ATTRIBUTION}
            url={TILE_URL}
            subdomains={TILE_SUBDOMAINS}
            maxZoom={TILE_MAX_ZOOM}
          />
          <Marker position={[coords.lat, coords.lng]} />
          <MapMover center={coords} />
        </MapContainer>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" />
        <span className="line-clamp-2">{address}</span>
      </p>

      {/* Botón para volver al centro de Sanchinarro. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-lg text-xs"
        onClick={resetToSanchinarro}
      >
        Volver a Sanchinarro
      </Button>
    </div>
  );
}
