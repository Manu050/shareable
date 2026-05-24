export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8 md:px-6">
      <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/40">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
