import { describe, it, expect } from 'vitest'
import { allowedRevisionTransitions, isApproved, formatRevision } from '@/lib/revision-status'

describe('allowedRevisionTransitions', () => {
  it('draft can only be submitted for review', () => {
    expect(allowedRevisionTransitions('draft')).toEqual(['under_review'])
  })
  it('under_review offers the four decisions', () => {
    expect(allowedRevisionTransitions('under_review').sort()).toEqual(
      ['approved', 'approved_with_comments', 'changes_requested', 'rejected'],
    )
  })
  it('changes_requested can be resubmitted', () => {
    expect(allowedRevisionTransitions('changes_requested')).toEqual(['under_review'])
  })
  it('never offers superseded as a manual move', () => {
    const all = (['draft', 'under_review', 'approved', 'approved_with_comments',
      'changes_requested', 'rejected', 'superseded'] as const)
      .flatMap((s) => allowedRevisionTransitions(s))
    expect(all).not.toContain('superseded')
  })
  it('terminal states have no manual transitions', () => {
    expect(allowedRevisionTransitions('rejected')).toEqual([])
    expect(allowedRevisionTransitions('superseded')).toEqual([])
  })
})

describe('isApproved', () => {
  it('is true for approved and approved_with_comments only', () => {
    expect(isApproved('approved')).toBe(true)
    expect(isApproved('approved_with_comments')).toBe(true)
    expect(isApproved('under_review')).toBe(false)
    expect(isApproved('superseded')).toBe(false)
  })
})

describe('formatRevision', () => {
  it('zero-pads to two digits with an R prefix', () => {
    expect(formatRevision(1)).toBe('R01')
    expect(formatRevision(9)).toBe('R09')
    expect(formatRevision(12)).toBe('R12')
  })
})
