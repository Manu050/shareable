"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const DEFAULT_MAX_IMAGES = 4;

export function ImageUploader({
  value,
  onChange,
  kind = "items",
  max = DEFAULT_MAX_IMAGES,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  kind?: "items" | "avatars";
  max?: number;
}) {
  const MAX_IMAGES = max;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const slots = MAX_IMAGES - value.length;
    const toUpload = Array.from(files).slice(0, slots);
    if (toUpload.length === 0) {
      setError(`Máximo ${MAX_IMAGES} imágenes.`);
      return;
    }

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo subir la imagen.");
        break;
      }
      const { url } = (await res.json()) as { url: string };
      uploaded.push(url);
    }
    setUploading(false);
    if (uploaded.length) onChange([...value, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {value.map((url, i) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary/30"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
                Portada
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              aria-label="Quitar imagen"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {value.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-card/40 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-muted disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
            <span>{uploading ? "Subiendo..." : "Añadir foto"}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {value.length}/{MAX_IMAGES} imágenes · JPG/PNG/WebP · máx. 5 MB
        </span>
        {value.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="rounded-lg"
            onClick={() => onChange([])}
          >
            Quitar todas
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
