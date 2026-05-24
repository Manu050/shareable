"use client";

import { format, formatRelative } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type DmMessage = {
  id: string;
  content: string;
  createdAt: Date | string;
  sender: { id: string; name: string | null; image: string | null };
};

function initials(name?: string | null) {
  const src = name?.trim() || "?";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

async function fetcher(url: string): Promise<{ messages: DmMessage[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

export function DmRoom({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: DmMessage[];
}) {
  const { data, mutate, isValidating } = useSWR(
    `/api/conversations/${conversationId}/messages`,
    fetcher,
    {
      fallbackData: { messages: initialMessages },
      refreshInterval: 3000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      dedupingInterval: 1000,
    },
  );

  const messages = data?.messages ?? [];
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setError(null);
    setSending(true);

    const optimistic: DmMessage = {
      id: `tmp-${Date.now()}`,
      content,
      createdAt: new Date(),
      sender: { id: currentUserId, name: null, image: null },
    };
    await mutate({ messages: [...messages, optimistic] }, { revalidate: false });

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "No se pudo enviar.");
      await mutate();
      return;
    }
    setContent("");
    await mutate();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-[60vh] flex-col overflow-y-auto rounded-2xl border border-border bg-card/30 p-4">
        {messages.length === 0 ? (
          <div className="m-auto flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <MessageCircle className="size-8" />
            <p>Aún no hay mensajes. ¡Di hola!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const mine = m.sender.id === currentUserId;
              const ts = typeof m.createdAt === "string" ? new Date(m.createdAt) : m.createdAt;
              return (
                <li key={m.id} className={cn("flex items-end gap-2", mine ? "flex-row-reverse" : "flex-row")}>
                  <Avatar className="size-7 shrink-0">
                    {m.sender.image && <AvatarImage src={m.sender.image} alt="" />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                      {initials(m.sender.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p
                      className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}
                      title={format(ts, "PPpp", { locale: es })}
                      suppressHydrationWarning
                    >
                      {formatRelative(ts, new Date(), { locale: es })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="space-y-2">
        <div className="flex items-end gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe un mensaje..."
            rows={2}
            className="resize-none"
            maxLength={2000}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(e);
              }
            }}
          />
          <Button type="submit" className="rounded-xl" disabled={sending || !content.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar
          </Button>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Enter para enviar · Shift+Enter nueva línea · {content.length}/2000</span>
          <span className={cn(isValidating && "animate-pulse")}>
            {isValidating ? "Sincronizando…" : "Actualizado"}
          </span>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
      </form>
    </div>
  );
}
