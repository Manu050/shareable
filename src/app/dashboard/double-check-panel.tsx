"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, Clock, Loader2, PackageCheck } from "lucide-react";
import type { RequestStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";

import {
  confirmReceipt,
  confirmReturn,
  deliverItem,
  markReturned,
} from "./actions";

type Result = { ok: true } | { ok: false; error: string };
type Action = (id: string) => Promise<Result>;

interface Step {
  label: string;
  icon: typeof PackageCheck;
  action: Action;
  variant?: "default" | "outline";
}

// Mapa (status, role) -> Step | { wait: "texto a mostrar" } | null (terminal)
function stepFor(
  status: RequestStatus,
  isOwner: boolean,
): Step | { wait: string } | null {
  switch (status) {
    case "accepted":
      return isOwner
        ? {
            label: "Marcar como entregado",
            icon: PackageCheck,
            action: deliverItem,
          }
        : { wait: "Esperando a que el dueño te entregue el objeto." };
    case "handed_over_by_owner":
      return isOwner
        ? { wait: "Esperando a que el receptor confirme la recepción." }
        : {
            label: "Confirmar recepción",
            icon: Check,
            action: confirmReceipt,
          };
    case "in_progress":
      return isOwner
        ? { wait: "Préstamo en curso. El receptor lo tiene." }
        : {
            label: "Marcar como devuelto",
            icon: ArrowRight,
            action: markReturned,
          };
    case "returned_by_borrower":
      return isOwner
        ? {
            label: "Confirmar devolución",
            icon: Check,
            action: confirmReturn,
            variant: "default",
          }
        : { wait: "Esperando a que el dueño confirme que lo ha recibido de vuelta." };
    default:
      return null; // pending/rejected/completed/etc. no exponen botones aquí
  }
}

export function DoubleCheckPanel({
  requestId,
  status,
  isOwner,
}: {
  requestId: string;
  status: RequestStatus;
  isOwner: boolean;
}) {
  const step = stepFor(status, isOwner);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!step) return null;

  if ("wait" in step) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        <Clock className="size-3.5 shrink-0" /> {step.wait}
      </p>
    );
  }

  const { icon: Icon, label, variant, action } = step;

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await action(requestId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant={variant ?? "default"}
        className="w-full rounded-xl"
        disabled={pending}
        onClick={run}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Icon className="size-3.5" />
        )}
        {label}
      </Button>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
