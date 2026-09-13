import { describe, it, expect } from 'vitest'
import { ticketCounts, healthTotals } from '@/lib/portfolio'
import type { HealthTicket } from '@/lib/health'

const t = (o: Partial<HealthTicket>): HealthTicket => ({
  type: 'task', status: 'open', priority: 'medium', due_date: null, ...o,
})

describe('ticketCounts', () => {
  it('buckets due-today, overdue, and open site issues', () => {
    const list: HealthTicket[] = [
      t({ due_date: '2026-09-13' }),                                   // due today
      t({ due_date: '2026-09-01' }),                                   // overdue (open)
      t({ due_date: '2026-09-01', status: 'closed' }),                 // overdue but finished → not counted
      t({ type: 'site_issue', status: 'in_progress' }),               // open site
      t({ type: 'site_issue', status: 'verified' }),                  // site but finished → not counted
    ]
    expect(ticketCounts(list, '2026-09-13')).toEqual({ dueToday: 1, overdue: 1, openSite: 1 })
  })

  it('is empty for no tickets', () => {
    expect(ticketCounts([], '2026-09-13')).toEqual({ dueToday: 0, overdue: 0, openSite: 0 })
  })
})

describe('healthTotals', () => {
  it('counts projects per health level', () => {
    expect(healthTotals(['red', 'red', 'green', 'yellow'])).toEqual({ green: 1, yellow: 1, red: 2 })
  })
})
