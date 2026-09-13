import { describe, it, expect } from 'vitest'
import { isAdmin, canDelete, canManageRoles } from '@/lib/permissions'

describe('permissions', () => {
  it('admin can do everything', () => {
    expect(isAdmin('admin')).toBe(true)
    expect(canDelete('admin')).toBe(true)
    expect(canManageRoles('admin')).toBe(true)
  })

  it('staff cannot delete or manage roles', () => {
    expect(isAdmin('staff')).toBe(false)
    expect(canDelete('staff')).toBe(false)
    expect(canManageRoles('staff')).toBe(false)
  })

  it('missing role is treated as non-admin', () => {
    for (const r of [null, undefined] as const) {
      expect(isAdmin(r)).toBe(false)
      expect(canDelete(r)).toBe(false)
      expect(canManageRoles(r)).toBe(false)
    }
  })
})
