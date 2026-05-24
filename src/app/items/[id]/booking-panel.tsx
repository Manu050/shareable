"use client";

import { differenceInCalendarDays, format, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BookingPanel({
  itemId,
  pricePerDay,
}: {
  itemId: string;
  pricePerDay: number;
}) {
  const router = useRouter();
  const today = startOfToday();

  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const days =
    range?.from && range?.to
      ? differenceInCalendarDays(range.to, range.from) + 1
      : 0;
  const total = days * pricePerDay;

  async function onReserve() {
    setError(null);
    if (!range?.from || !range?.to) {
      setError("Elige las fechas de la reserva.");
      return;
    }
    setLoading(true);
    // Enviamos YYYY-MM-DD (fecha civil), no ISO UTC: evita que un usuario en
    // Madrid (UTC+2) que elige "10 mayo" llegue al servidor como "9 mayo 22:00Z".
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        startDate: ymd(range.from),
        endDate: ymd(range.to),
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "No se pudo enviar la solicitud.");
      return;
    }
    router.push("/dashboard?reserved=1");
    router.refresh();
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Reservar</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          numberOfMonths={1}
          disabled={{ before: today }}
          locale={es}
          weekStartsOn={1}
          className="rounded-xl border border-border"
        />

        <div className="w-full space-y-1 text-sm">
          {range?.from && range?.to ? (
            <>
              <p className="text-muted-foreground">
                Del{" "}
                <span className="font-medium text-foreground">
                  {format(range.from, "d 'de' MMM", { locale: es })}
                </span>{" "}
                al{" "}
                <span className="font-medium text-foreground">
                  {format(range.to, "d 'de' MMM yyyy", { locale: es })}
                </span>
              </p>
              <p className="flex justify-between border-t border-border pt-2 tabular-nums">
                <span className="text-muted-foreground">
                  {days} {days === 1 ? "día" : "días"}
                  {pricePerDay > 0
                    ? ` × ${pricePerDay.toFixed(2).replace(".", ",")} €`
                    : ""}
                </span>
                <span className="font-semibold">
                  {pricePerDay === 0
                    ? "Gratis"
                    : `${total.toFixed(2).replace(".", ",")} €`}
                </span>
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              Selecciona la fecha de inicio y la de devolución.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="w-full rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full rounded-xl"
          onClick={onReserve}
          disabled={loading || !range?.from || !range?.to}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Reservar
        </Button>
      </CardFooter>
    </Card>
  );
}
