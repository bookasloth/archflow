import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { isAdmin, type Role } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { setUserRole } from '@/app/(app)/admin-actions'

type ProfileRow = { id: string; full_name: string | null; role: Role }

export default async function AdminUsersPage() {
  const { user, role } = await getCurrentUserWithRole()
  if (!isAdmin(role)) notFound()

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name')
  const profiles = (data as ProfileRow[]) ?? []

  return (
    <main className="max-w-2xl space-y-5">
      <PageHeader title="Users" meta={<span className="text-ink-faint">Manage staff and admin access</span>} />

      <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
        {profiles.map((p) => {
          const self = p.id === user!.id
          const to: Role = p.role === 'admin' ? 'staff' : 'admin'
          return (
            <li key={p.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="truncate text-ink">{p.full_name ?? 'Unnamed'}{self && ' (you)'}</div>
                <div className="text-xs text-ink-faint">{p.role}</div>
              </div>
              {/* Can't demote yourself — keeps at least one admin in control. */}
              {!(self && p.role === 'admin') && (
                <form action={setUserRole}>
                  <input type="hidden" name="user_id" value={p.id} />
                  <input type="hidden" name="to" value={to} />
                  <button className="rounded border border-subtle px-2.5 py-1 text-xs text-ink-muted hover:bg-surface-hover">
                    {to === 'admin' ? 'Make admin' : 'Make staff'}
                  </button>
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </main>
  )
}
