export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="h-9 w-40 animate-pulse rounded-lg bg-muted md:h-10 md:w-48" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-wrap gap-2 self-start md:self-auto">
          <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded-xl bg-muted" />
        </div>
      </header>

      <div className="mb-6 h-10 animate-pulse rounded-xl bg-muted" />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card/40">
            <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
            <div className="space-y-2 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
