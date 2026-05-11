"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "accept" | "reject") {
    setError(null);
    setPending(action);
    const res = await fetch(`/api/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setPending(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "No se pudo actualizar la reserva.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 rounded-xl"
          onClick={() => run("accept")}
          disabled={pending !== null}
        >
          {pending === "accept" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Aceptar
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="flex-1 rounded-xl"
          onClick={() => run("reject")}
          disabled={pending !== null}
        >
          {pending === "reject" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
          Rechazar
        </Button>
      </div>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
