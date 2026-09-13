import { describe, it, expect } from 'vitest'
import { applyFilters, applySort, groupBy, matchesCondition } from '@/lib/view'

const rows = [
  { id: '1', status: 'open', assignee: 'Ana', due: '2026-09-10' },
  { id: '2', status: 'closed', assignee: 'Ben', due: '2026-09-20' },
  { id: '3', status: 'open', assignee: '', due: '' },
]

describe('matchesCondition', () => {
  it('handles each operator', () => {
    expect(matchesCondition(rows[0], { field: 'status', op: 'is', value: 'open' })).toBe(true)
    expect(matchesCondition(rows[0], { field: 'status', op: 'is_not', value: 'open' })).toBe(false)
    expect(matchesCondition(rows[0], { field: 'assignee', op: 'contains', value: 'an' })).toBe(true)
    expect(matchesCondition(rows[1], { field: 'due', op: 'after', value: '2026-09-15' })).toBe(true)
    expect(matchesCondition(rows[0], { field: 'due', op: 'before', value: '2026-09-15' })).toBe(true)
    expect(matchesCondition(rows[2], { field: 'assignee', op: 'is_empty' })).toBe(true)
    expect(matchesCondition(rows[0], { field: 'assignee', op: 'is_set' })).toBe(true)
  })
})

describe('applyFilters', () => {
  it('ANDs conditions; empty conditions is identity', () => {
    expect(applyFilters(rows, [])).toHaveLength(3)
    const r = applyFilters(rows, [
      { field: 'status', op: 'is', value: 'open' },
      { field: 'assignee', op: 'is_set' },
    ])
    expect(r.map((x) => x.id)).toEqual(['1'])
  })
})

describe('applySort', () => {
  it('sorts with empties last in both directions', () => {
    expect(applySort(rows, { field: 'due', dir: 'asc' }).map((r) => r.id)).toEqual(['1', '2', '3'])
    expect(applySort(rows, { field: 'due', dir: 'desc' }).map((r) => r.id)).toEqual(['2', '1', '3'])
    expect(applySort(rows, null)).toBe(rows)
  })
})

describe('groupBy', () => {
  it('groups by field, empty → None, key order by first appearance', () => {
    const g = groupBy(rows, 'status')
    expect(g.map((x) => x.key)).toEqual(['open', 'closed'])
    expect(g[0].rows).toHaveLength(2)
    expect(groupBy(rows, 'assignee').map((x) => x.key)).toEqual(['Ana', 'Ben', 'None'])
  })
})
