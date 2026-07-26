// app/menu/loading.tsx
// Next.js automatically wraps page.tsx in <Suspense> using this file.
// Shown while the Server Component fetches menu items from Supabase.

export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-[#121212] text-[#E0E0E0] animate-pulse">
      {/* Header skeleton */}
      <div className="border-b border-white/5 bg-[#181818] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-44 rounded-lg bg-white/10" />
            <div className="h-3 w-64 rounded-lg bg-white/5" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-44 rounded-xl bg-white/5" />
            <div className="h-8 w-36 rounded-xl bg-primary/20" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Metric cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between"
            >
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-7 w-12 rounded bg-white/10" />
              </div>
              <div className="h-11 w-11 rounded-xl bg-white/5" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <section className="rounded-2xl bg-[#242424] p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="h-4 w-44 rounded bg-white/10" />
            <div className="h-8 w-28 rounded-xl bg-white/5" />
          </div>

          {/* Filters bar skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#1A1A1A] p-4 rounded-xl border border-white/5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-2.5 w-20 rounded bg-white/10" />
                <div className="h-8 w-full rounded-xl bg-white/5" />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="bg-[#181818] px-4 py-3 flex gap-6 border-b border-white/5">
              {[40, 160, 100, 60, 80, 80].map((w, i) => (
                <div key={i} className="h-3 rounded bg-white/10" style={{ width: w }} />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="px-4 py-3.5 flex items-center gap-6 border-b border-white/5 last:border-0"
              >
                <div className="h-10 w-10 rounded-xl bg-white/5" />
                <div className="space-y-1.5">
                  <div className="h-3 w-36 rounded bg-white/10" />
                  <div className="h-2.5 w-24 rounded bg-white/5" />
                </div>
                <div className="h-6 w-24 rounded-lg bg-white/5" />
                <div className="h-3 w-14 rounded bg-primary/20" />
                <div className="h-6 w-24 rounded-full bg-emerald-500/10" />
                <div className="ml-auto flex gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10" />
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
