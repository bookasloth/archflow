import type { HealthTicket } from '@/lib/health'

export type Health = 'green' | 'yellow' | 'red'
export type ProjectCounts = { dueToday: number; overdue: number; openSite: number }

const FINISHED = ['closed', 'verified']

// Per-project ticket rollup. `isoToday` is a YYYY-MM-DD string (compared lexicographically
// against due_date, which is stored the same way).
export function ticketCounts(list: HealthTicket[], isoToday: string): ProjectCounts {
  return {
    dueToday: list.filter((t) => t.due_date === isoToday).length,
    overdue: list.filter((t) => t.due_date != null && t.due_date < isoToday && !FINISHED.includes(t.status)).length,
    openSite: list.filter((t) => t.type === 'site_issue' && ['open', 'in_progress'].includes(t.status)).length,
  }
}

// Count of projects at each health level, for the portfolio summary.
export function healthTotals(healths: Health[]): Record<Health, number> {
  const acc: Record<Health, number> = { green: 0, yellow: 0, red: 0 }
  for (const h of healths) acc[h] += 1
  return acc
}
