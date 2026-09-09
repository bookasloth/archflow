import { describe, it, expect } from 'vitest'
import { nextMaterialStatuses, categoryLabel } from '@/lib/materials'

describe('nextMaterialStatuses', () => {
  it('proposed can be approved or rejected', () => {
    expect(nextMaterialStatuses('proposed').sort()).toEqual(['approved', 'rejected'])
  })
  it('approved can only be reopened', () => {
    expect(nextMaterialStatuses('approved')).toEqual(['proposed'])
  })
  it('rejected can only be reopened', () => {
    expect(nextMaterialStatuses('rejected')).toEqual(['proposed'])
  })
})

describe('categoryLabel', () => {
  it('humanizes an underscored enum value', () => {
    expect(categoryLabel('wall_finish')).toBe('Wall finish')
  })
  it('capitalizes a single-word value', () => {
    expect(categoryLabel('other')).toBe('Other')
  })
})
