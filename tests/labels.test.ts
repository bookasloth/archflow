import { describe, it, expect } from 'vitest'
import { statusLabel, priorityLabel, disciplineLabel, revisionLabel } from '@/lib/labels'

describe('labels', () => {
  it('humanizes ticket status', () => {
    expect(statusLabel('in_progress')).toBe('In progress')
    expect(statusLabel('open')).toBe('Open')
  })
  it('humanizes priority', () => {
    expect(priorityLabel('critical')).toBe('Critical')
  })
  it('humanizes discipline with multi-word cases', () => {
    expect(disciplineLabel('fire_safety')).toBe('Fire safety')
    expect(disciplineLabel('client_coordination')).toBe('Client coordination')
  })
  it('humanizes revision status', () => {
    expect(revisionLabel('approved_with_comments')).toBe('Approved with comments')
    expect(revisionLabel('changes_requested')).toBe('Changes requested')
  })
})
