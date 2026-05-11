"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WantedItemStatus } from "@prisma/client";

export function WantedActions({
  wantedId,
  status,
}: {
  wantedId: string;
  status: WantedItemStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"fulfill" | "cancel" | "extend" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function run(action: "fulfill" | "cancel" | "extend") {
    setError(null);
    setPending(action);
    const res = await fetch(`/api/wanted-items/${wantedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setPending(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "No se pudo actualizar.");
      return;
    }
    router.refresh();
  }

  if (status !== "open") {
    return (
      <p className="text-sm text-muted-foreground">
        Esta petición ya está {status === "fulfilled" ? "resuelta" : "cancelada"}.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        className="rounded-xl"
        disabled={pending !== null}
        onClick={() => run("fulfill")}
      >
        {pending === "fulfill" && <Loader2 className="size-3.5 animate-spin" />}
        Marcar resuelta
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-xl"
        disabled={pending !== null}
        onClick={() => run("extend")}
      >
        {pending === "extend" && <Loader2 className="size-3.5 animate-spin" />}
        Prorrogar 30 días
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="rounded-xl"
        disabled={pending !== null}
        onClick={() => run("cancel")}
      >
        {pending === "cancel" && <Loader2 className="size-3.5 animate-spin" />}
        Cancelar petición
      </Button>
      {error && (
        <p className="w-full rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
