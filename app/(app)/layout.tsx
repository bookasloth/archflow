import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'
import { HeaderBreadcrumb } from '@/components/HeaderBreadcrumb'
import { CommandMenu } from '@/components/CommandMenu'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: projectRows } = await supabase.from('projects').select('id, name').order('name')
  const projects = (projectRows as { id: string; name: string }[]) ?? []

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar role={role} projects={projects} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-subtle bg-surface px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <MobileNav role={role} projects={projects} />
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
