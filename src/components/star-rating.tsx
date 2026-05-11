"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

// Display read-only de un rating numérico (0..5, decimales OK).
export function StarsDisplay({
  value,
  size = "size-4",
  className,
}: {
  value: number;
  size?: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i;
        const partial = !filled && value > i - 1;
        return (
          <span key={i} className="relative inline-block">
            <Star className={cn(size, "text-muted-foreground/30")} />
            {(filled || partial) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{
                  width: filled ? "100%" : `${(value - (i - 1)) * 100}%`,
                }}
              >
                <Star className={cn(size, "fill-primary text-primary")} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// Selector interactivo 1..5.
export function StarsInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <div
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(null)}
      role="radiogroup"
      aria-label="Estrellas"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "size-7 transition-colors",
              i <= shown
                ? "fill-primary text-primary"
                : "fill-transparent text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
