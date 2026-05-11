"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StarsInput } from "@/components/star-rating";
import { Textarea } from "@/components/ui/textarea";

import { submitRating } from "./rating-actions";

export function RatingForm({
  requestId,
  counterpartName,
}: {
  requestId: string;
  counterpartName: string;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (stars < 1) {
      setError("Selecciona al menos una estrella.");
      return;
    }
    startTransition(async () => {
      const res = await submitRating({
        requestId,
        stars,
        comment: comment.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <p className="rounded-lg bg-accent/15 px-3 py-2 text-xs text-accent">
        Gracias por valorar a {counterpartName}.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-xl bg-muted/40 p-3">
      <p className="text-xs font-medium">Valora a {counterpartName}</p>
      <StarsInput value={stars} onChange={setStars} />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Un comentario corto (opcional)..."
        className="text-sm"
      />
      {error && (
        <p className="rounded-lg bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="sm" className="rounded-xl" disabled={pending || stars < 1}>
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Enviar valoración
      </Button>
    </form>
  );
}
