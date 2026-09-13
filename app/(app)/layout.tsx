import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/permissions'
import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'
import { HeaderBreadcrumb } from '@/components/HeaderBreadcrumb'
import { CommandMenu } from '@/components/CommandMenu'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // One parallel batch instead of four sequential round-trips (matters on every navigation).
  const [roleRes, projectRes, favRes, recentRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('projects').select('id, name').order('name'),
    supabase.from('favorites').select('entity_id').eq('user_id', user.id).eq('entity_type', 'project'),
    supabase.from('recently_viewed').select('entity_id').eq('user_id', user.id).eq('entity_type', 'project')
      .order('viewed_at', { ascending: false }).limit(8),
  ])
  const role = (roleRes.data?.role ?? 'staff') as Role
  const projects = (projectRes.data as { id: string; name: string }[]) ?? []
  const byId = new Map(projects.map((p) => [p.id, p.name]))
  const asRefs = (ids: string[]) => ids.filter((id) => byId.has(id)).map((id) => ({ id, name: byId.get(id)! }))
  const favorites = asRefs(((favRes.data as { entity_id: string }[]) ?? []).map((r) => r.entity_id))
  const recent = asRefs(((recentRes.data as { entity_id: string }[]) ?? []).map((r) => r.entity_id))

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar role={role} projects={projects} favorites={favorites} recent={recent} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-subtle bg-surface px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <MobileNav role={role} projects={projects} favorites={favorites} recent={recent} />
            <HeaderBreadcrumb projects={projects} />
          </div>
          <div className="flex items-center gap-3">
            <CommandMenu />
            {role === 'admin' && (
              <span className="hidden rounded-full border border-subtle px-2 py-0.5 text-[11px] text-ink-muted sm:inline">admin</span>
            )}
            <form action="/auth/signout" method="post">
              <button className="text-sm text-ink-muted hover:text-ink">Sign out</button>
            </form>
          </div>
        </header>
        <div className="min-w-0 flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}
