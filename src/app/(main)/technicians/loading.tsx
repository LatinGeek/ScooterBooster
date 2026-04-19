import { Skeleton } from "@/components/ui/skeleton"

export default function TechniciansLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <Skeleton className="mb-2 h-9 w-48" />
      <Skeleton className="mb-8 h-4 w-64" />

      {/* Filter bar */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Technician cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
            {/* Avatar + name */}
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            {/* Stars */}
            <div className="mb-3 flex gap-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-4 rounded-sm" />
              ))}
            </div>
            {/* Services */}
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            {/* CTA */}
            <Skeleton className="mt-4 h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </main>
  )
}
