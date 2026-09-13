// Slice 13: permission rules. Single firm, two roles.
// admin = full CRUD incl. destructive actions + role management.
// staff = create/edit/status; no deletes, no role changes.
// The DB (RLS) is the real boundary; the UI consumes these to hide controls it can't use.

export type Role = 'staff' | 'admin'

export function isAdmin(role: Role | null | undefined): boolean {
  return role === 'admin'
}

// Deletes are admin-only (mirrors the RLS delete policy).
export function canDelete(role: Role | null | undefined): boolean {
  return role === 'admin'
}

// Only admins may change another user's role.
export function canManageRoles(role: Role | null | undefined): boolean {
  return role === 'admin'
}
