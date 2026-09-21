// app/menu/loading.tsx
// Next.js automatically wraps page.tsx in <Suspense> using this file.
// Shown while the Server Component fetches menu items from Supabase.

export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-background text-text-light animate-pulse">
      {/* Header skeleton */}
      <div className="border-b border-border bg-card/40 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-44 rounded-lg bg-white/10" />
            <div className="h-3 w-64 rounded-md bg-white/5" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-44 rounded-lg bg-secondary border border-border" />
            <div className="h-8 w-36 rounded-lg bg-primary/20" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Metric cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-card p-5 border border-border flex items-center justify-between shadow-sm"
            >
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-7 w-12 rounded bg-white/10 font-mono" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-white/5" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <section className="rounded-xl bg-card p-6 border border-border space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="h-4 w-44 rounded bg-white/10" />
            <div className="h-8 w-28 rounded-lg bg-white/5" />
          </div>

          {/* Filters bar skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-background/50 p-4 rounded-xl border border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-2.5 w-20 rounded bg-white/10" />
                <div className="h-8 w-full rounded-lg bg-background border border-border" />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-background/50 px-4 py-3 flex gap-6 border-b border-border">
              {[40, 160, 100, 60, 80, 80].map((w, i) => (
                <div
                  key={i}
                  className="h-3 rounded bg-white/10"
                  style={{ width: w }}
                />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="px-4 py-3.5 flex items-center gap-6 border-b border-border last:border-0"
              >
                <div className="h-10 w-10 rounded-lg bg-secondary" />
                <div className="space-y-1.5">
                  <div className="h-3 w-36 rounded bg-white/10" />
                  <div className="h-2.5 w-24 rounded bg-white/5" />
                </div>
                <div className="h-6 w-24 rounded-md bg-secondary border border-border" />
                <div className="h-3 w-14 rounded bg-primary/20 font-mono" />
                <div className="h-6 w-24 rounded-md bg-emerald-500/10 border border-emerald-500/20" />
                <div className="ml-auto flex gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10" />
                  <div className="h-8 w-8 rounded-lg bg-secondary border border-border" />
                  <div className="h-8 w-8 rounded-lg bg-rose-500/10" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
