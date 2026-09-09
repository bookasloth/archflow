import { describe, it, expect } from 'vitest'
import { columnsFor } from '@/lib/kanban-columns'

describe('columnsFor', () => {
  it('task uses only open, in_progress, closed (never resolved/verified)', () => {
    expect(columnsFor('task')).toEqual(['open', 'in_progress', 'closed'])
  })
  it('site_issue uses the full pipeline in order', () => {
    expect(columnsFor('site_issue')).toEqual([
      'open', 'in_progress', 'resolved', 'verified', 'closed',
    ])
  })
})
