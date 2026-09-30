import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton'

// Group-level fallback: shown the instant you navigate to any (app) page
// whose data isn't ready yet. Neutral list shape fits dashboard, my-work,
// site, materials, reports, activity — no white flash on click.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-7 w-44" />
      <SkeletonRows rows={7} />
    </div>
  )
}
