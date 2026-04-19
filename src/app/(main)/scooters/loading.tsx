import { Skeleton } from "@/components/ui/skeleton"

export default function ScootersLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {/* Page title */}
      <Skeleton className="mb-2 h-9 w-48" />
      <Skeleton className="mb-10 h-4 w-64" />

      {/* Brand tabs */}
      <div className="mb-8 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Model grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
            <Skeleton className="mb-4 h-40 w-full rounded-lg" />
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-3 h-3 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
