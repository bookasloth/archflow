// "How long has this card sat here" — the column already says the status, so drawing cards
// show age instead. Counted from the decision for decided stages, else from upload.
// ponytail: no submitted_at column yet, so "under review" age counts from upload; add the
// column (and prefer it here) if exact review turnaround matters.
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000))
}

export function ageLabel(days: number): string {
  if (days === 0) return 'today'
  if (days < 14) return `${days}d`
  if (days < 60) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

// Reviews waiting over a week are the ones an architect chases.
export const isStale = (status: string | null, days: number) => status === 'under_review' && days > 7
