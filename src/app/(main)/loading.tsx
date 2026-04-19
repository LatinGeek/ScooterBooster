import { Skeleton } from "@/components/ui/skeleton"

// Generic page skeleton used by the (main) route group fallback
export default function MainLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <Skeleton className="mx-auto mb-4 h-8 w-48" />
      <Skeleton className="mx-auto mb-12 h-4 w-72" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
            <Skeleton className="mb-4 h-10 w-10 rounded-lg" />
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mt-1 h-3 w-5/6" />
          </div>
        ))}
      </div>
    </main>
  )
}
