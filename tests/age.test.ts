import { describe, it, expect } from 'vitest'
import { daysSince, ageLabel, isStale } from '@/lib/age'

describe('age', () => {
  const now = new Date('2026-10-11T12:00:00Z')
  it('counts whole days, never negative', () => {
    expect(daysSince('2026-10-11T01:00:00Z', now)).toBe(0)
    expect(daysSince('2026-10-05T12:00:00Z', now)).toBe(6)
    expect(daysSince('2026-10-12T12:00:00Z', now)).toBe(0)
  })
  it('labels days, weeks, months', () => {
    expect(ageLabel(0)).toBe('today')
    expect(ageLabel(6)).toBe('6d')
    expect(ageLabel(20)).toBe('2w')
    expect(ageLabel(95)).toBe('3mo')
  })
  it('flags only reviews waiting over a week', () => {
    expect(isStale('under_review', 8)).toBe(true)
    expect(isStale('under_review', 7)).toBe(false)
    expect(isStale('draft', 30)).toBe(false)
  })
})
