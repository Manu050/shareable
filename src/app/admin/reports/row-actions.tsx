"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, RotateCcw, UserCheck, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  reactivateUser,
  reopenReport,
  resolveReport,
  suspendUser,
} from "../actions";

type Result = { ok: true } | { ok: false; error: string };
type Action = () => Promise<Result>;

export function ReportRowActions({
  reportId,
  isResolved,
  otherPartyId,
  otherPartyName,
  otherPartySuspended,
}: {
  reportId: string;
  isResolved: boolean;
  otherPartyId: string;
  otherPartyName: string;
  otherPartySuspended: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: Action) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {isResolved ? (
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={pending}
            onClick={() => run(() => reopenReport(reportId))}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
            Reabrir
          </Button>
        ) : (
          <Button
            size="sm"
            className="rounded-xl"
            disabled={pending}
            onClick={() => run(() => resolveReport(reportId))}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Marcar resuelto
          </Button>
        )}

        {otherPartySuspended ? (
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={pending}
            onClick={() => run(() => reactivateUser(otherPartyId))}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserCheck className="size-3.5" />
            )}
            Reactivar a {otherPartyName.split(" ")[0]}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            className="rounded-xl"
            disabled={pending}
            onClick={() => run(() => suspendUser(otherPartyId))}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserX className="size-3.5" />
            )}
            Suspender a {otherPartyName.split(" ")[0]}
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
