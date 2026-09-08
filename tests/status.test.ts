import { describe, it, expect } from 'vitest'
import { allowedTransitions, canTransition } from '@/lib/status'

describe('allowedTransitions', () => {
  it('task: open can go to in_progress or closed', () => {
    expect(allowedTransitions('task', 'open').sort()).toEqual(['closed', 'in_progress'])
  })
  it('task: never exposes resolved/verified', () => {
    const all = (['open', 'in_progress', 'closed'] as const).flatMap((s) => allowedTransitions('task', s))
    expect(all).not.toContain('resolved')
    expect(all).not.toContain('verified')
  })
  it('site_issue: resolved can go to verified or back to in_progress', () => {
    expect(allowedTransitions('site_issue', 'resolved').sort()).toEqual(['in_progress', 'verified'])
  })
})

describe('canTransition', () => {
  it('blocks verified without an after photo', () => {
    expect(canTransition('site_issue', 'resolved', 'verified', { hasAfterPhoto: false })).toBe(false)
  })
  it('allows verified with an after photo', () => {
    expect(canTransition('site_issue', 'resolved', 'verified', { hasAfterPhoto: true })).toBe(true)
  })
  it('rejects a transition not in the allowed set', () => {
    expect(canTransition('task', 'open', 'verified', { hasAfterPhoto: true })).toBe(false)
  })
})
