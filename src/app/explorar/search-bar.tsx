"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ITEM_CATEGORIES } from "@/lib/categories";

const ALL = "__all__";

export function SearchBar() {
  const router = useRouter();
  const search = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(search.get("q") ?? "");
  const [category, setCategory] = useState(search.get("category") ?? ALL);

  function push(nextQ: string, nextCat: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextCat !== ALL) params.set("category", nextCat);
    startTransition(() => {
      router.replace(`/explorar${params.size ? `?${params.toString()}` : ""}`);
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <form
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          push(q, category);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca por título o descripción..."
          className="pl-9 pr-9"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              push("", category);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Limpiar"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      <Select
        value={category}
        onValueChange={(v) => {
          const next = v ?? ALL;
          setCategory(next);
          push(q, next);
        }}
      >
        <SelectTrigger className="w-full rounded-lg sm:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las categorías</SelectItem>
          {ITEM_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        className="rounded-xl"
        onClick={() => push(q, category)}
      >
        Buscar
      </Button>
    </div>
  );
}
