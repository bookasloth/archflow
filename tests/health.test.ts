import { describe, it, expect } from 'vitest'
import { computeHealth, type HealthTicket } from '@/lib/health'

const today = new Date('2026-09-08')
const base: HealthTicket = { type: 'task', status: 'open', priority: 'medium', due_date: null }

describe('computeHealth', () => {
  it('green when nothing pressing', () => {
    expect(computeHealth([{ ...base, due_date: '2026-12-01' }], today)).toBe('green')
  })
  it('red when a ticket is overdue and still open', () => {
    expect(computeHealth([{ ...base, due_date: '2026-09-01' }], today)).toBe('red')
  })
  it('overdue ignored when ticket is closed/verified', () => {
    expect(computeHealth([{ ...base, status: 'closed', due_date: '2026-09-01' }], today)).toBe('green')
  })
  it('red when a critical ticket is open', () => {
    expect(computeHealth([{ ...base, priority: 'critical' }], today)).toBe('red')
  })
  it('yellow when a site issue is open (not overdue/critical)', () => {
    expect(computeHealth([{ ...base, type: 'site_issue', priority: 'low' }], today)).toBe('yellow')
  })
  it('yellow when due within 3 days', () => {
    expect(computeHealth([{ ...base, due_date: '2026-09-10' }], today)).toBe('yellow')
  })
})
