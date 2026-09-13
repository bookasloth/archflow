import { redirect } from 'next/navigation'
import { getCurrentUserWithRole } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-subtle bg-surface px-5 py-2.5">
          <div className="text-sm text-ink-faint">
            {/* Breadcrumb + global search land in later slices */}
            <span className="text-ink-muted">Search coming soon</span>
          </div>
          <div className="flex items-center gap-3">
            {role === 'admin' && (
              <span className="rounded-full border border-subtle px-2 py-0.5 text-[11px] text-ink-muted">admin</span>
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
