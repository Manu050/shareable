"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";

export function SendMessageButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function openConversation() {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });
      if (!res.ok) throw new Error();
      const { conversation } = (await res.json()) as { conversation: { id: string } };
      router.push(`/mensajes/${conversation.id}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={openConversation}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <MessageCircle className="size-3.5" />
      )}
      Enviar mensaje
    </button>
  );
}
