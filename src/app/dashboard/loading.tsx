export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-12 px-4 py-12 md:px-6 md:py-16">
      <header className="space-y-2">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-muted md:h-10 md:w-64" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </header>

      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="size-5 animate-pulse rounded bg-muted" />
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, card) => (
              <div key={card} className="space-y-3 rounded-2xl border border-border bg-card/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-5 w-3/5 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-9 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
