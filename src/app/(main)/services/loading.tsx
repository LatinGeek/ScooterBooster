import { Skeleton } from "@/components/ui/skeleton"

export default function ServicesLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <Skeleton className="mx-auto mb-2 h-9 w-52" />
      <Skeleton className="mx-auto mb-12 h-4 w-72" />

      <div className="space-y-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 flex-shrink-0 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="mb-2 h-6 w-48" />
                <Skeleton className="mb-1 h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
