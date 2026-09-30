// ponytail: one primitive, Tailwind's native animate-pulse — no shimmer keyframe, no lib.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded bg-surface-hover ${className}`} />
}

// A stack of list rows that matches the real list layout (dot + title left, meta right).
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="hidden h-3 w-56 sm:block" />
        </div>
      ))}
    </div>
  )
}
