"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import "@/components/map-styles";
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
    map.setView([center.lat, center.lng], 16, { animate: true });
  }, [center, map]);
  return null;
}

export function AddressPicker({
  onChange,
}: {
  onChange: (c: Coords & { address: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<Coords>({
    lat: DEFAULT_LATITUDE,
    lng: DEFAULT_LONGITUDE,
  });
  const [address, setAddress] = useState<string>("Sanchinarro, Madrid");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza el padre cuando cambian las coordenadas.
  useEffect(() => {
    onChange({ ...coords, address });
    // Solo cuando cambian las coords/dir, no cuando cambia onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, address]);

  function search(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (q.trim().length < 3) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        // Sesgamos la búsqueda hacia Madrid (Sanchinarro).
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", q);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "0");
        url.searchParams.set("limit", "5");
        url.searchParams.set("countrycodes", "es");
        url.searchParams.set("viewbox", "-3.75,40.55,-3.55,40.42");
        url.searchParams.set("bounded", "1");
        const res = await fetch(url, {
          headers: { "Accept-Language": "es" },
        });
        const data: NominatimResult[] = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function pick(r: NominatimResult) {
    setCoords({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setAddress(r.display_name);
    setQuery(r.display_name);
    setResults([]);
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
            {results.map((r, i) => (
              <li key={i}>
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
        onClick={() => {
          setCoords({ lat: DEFAULT_LATITUDE, lng: DEFAULT_LONGITUDE });
          setAddress("Sanchinarro, Madrid");
          setQuery("");
        }}
      >
        Volver a Sanchinarro
      </Button>
    </div>
  );
}
