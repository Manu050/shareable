"use client";

import Image from "next/image";
import { PackageOpen } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function ImageGallery({
  images,
  alt,
}: {
  images: { id: string; url: string }[];
  alt: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-secondary/40 text-primary/60">
        <PackageOpen className="size-20" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-secondary/40">
        <Image
          src={images[active]!.url}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square w-20 overflow-hidden rounded-xl border-2 transition-all",
                i === active
                  ? "border-primary shadow-sm"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
              aria-label={`Ver foto ${i + 1}`}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
