import { Skeleton } from '@/components/ui/Skeleton'

// Project overview shape: title + meta, then a row of stat cards, then a list.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading project">
      <div className="mb-5 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-subtle bg-surface p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2">
        <Skeleton className="h-5 w-32" />
        <div className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
