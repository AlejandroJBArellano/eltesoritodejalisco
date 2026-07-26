// app/customers/loading.tsx
// Next.js automatically wraps page.tsx in <Suspense> using this file.
// Shown while the Server Component fetches data from Supabase.

export default function CustomersLoading() {
  return (
    <div className="min-h-screen bg-[#121212] text-[#E0E0E0] animate-pulse">
      {/* Header skeleton */}
      <div className="border-b border-white/5 bg-[#181818] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 rounded-lg bg-white/10" />
            <div className="h-3 w-72 rounded-lg bg-white/5" />
          </div>
          <div className="h-8 w-32 rounded-xl bg-emerald-500/20" />
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Metric cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between"
            >
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-7 w-16 rounded bg-white/10" />
              </div>
              <div className="h-11 w-11 rounded-xl bg-white/5" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <section className="rounded-2xl bg-[#242424] p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="h-4 w-48 rounded bg-white/10" />
            <div className="h-8 w-56 rounded-xl bg-white/5" />
          </div>

          <div className="rounded-xl border border-white/5 overflow-hidden">
            {/* Table header */}
            <div className="bg-[#181818] px-4 py-3 flex gap-6 border-b border-white/5">
              {[140, 100, 80, 60, 80, 60].map((w, i) => (
                <div key={i} className={`h-3 w-${w} rounded bg-white/10`} style={{ width: w }} />
              ))}
            </div>
            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="px-4 py-3.5 flex items-center gap-6 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10" />
                  <div className="h-3 w-28 rounded bg-white/10" />
                </div>
                <div className="h-3 w-24 rounded bg-white/5" />
                <div className="h-3 w-16 rounded bg-white/5" />
                <div className="h-5 w-20 rounded-full bg-amber-500/10" />
                <div className="h-3 w-16 rounded bg-white/5" />
                <div className="ml-auto flex gap-2">
                  <div className="h-8 w-8 rounded-lg bg-white/5" />
                  <div className="h-8 w-8 rounded-lg bg-red-500/10" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
