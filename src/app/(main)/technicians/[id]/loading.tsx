export default function TechnicianDetailLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 h-5 w-32 animate-pulse rounded bg-[#e5e7eb]" />

      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="h-24 w-24 animate-pulse rounded-full bg-[#e5e7eb]" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-56 animate-pulse rounded bg-[#e5e7eb]" />
          <div className="h-5 w-72 animate-pulse rounded bg-[#f3f4f6]" />
          <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-[#f3f4f6]" />
        </div>
        <div className="w-full max-w-[220px] space-y-3">
          <div className="h-11 animate-pulse rounded-lg bg-[#d1fae5]" />
          <div className="h-11 animate-pulse rounded-lg bg-[#d1fae5]" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="space-y-3">
            <div className="h-6 w-48 animate-pulse rounded bg-[#e5e7eb]" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-[#f8fafc]" />
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-[#e5e7eb]" />
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-[#f8fafc]" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-64 animate-pulse rounded-2xl bg-[#f8fafc]" />
          <div className="h-40 animate-pulse rounded-2xl bg-[#f8fafc]" />
        </div>
      </div>
    </main>
  )
}
