"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WantedItemStatus } from "@prisma/client";

import { cancelWantedItem } from "@/app/admin/actions";

export function WantedAdminActions({
  wantedId,
  status,
}: {
  wantedId: string;
  status: WantedItemStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "open") return null;

  async function handleCancel() {
    setError(null);
    setPending(true);
    const result = await cancelWantedItem(wantedId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        variant="destructive"
        className="rounded-xl"
        disabled={pending}
        onClick={handleCancel}
      >
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Cancelar
      </Button>
    </div>
  );
}
