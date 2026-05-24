"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UserStatus } from "@prisma/client";

import { suspendUser, reactivateUser } from "@/app/admin/actions";

export function UserRowActions({
  userId,
  status,
}: {
  userId: string;
  status: UserStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setPending(true);
    const result =
      status === "active" ? await suspendUser(userId) : await reactivateUser(userId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <Button
        size="sm"
        variant={status === "active" ? "destructive" : "outline"}
        className="rounded-xl"
        disabled={pending}
        onClick={toggle}
      >
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        {status === "active" ? "Suspender" : "Reactivar"}
      </Button>
    </div>
  );
}
