import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-subtle bg-surface px-5 py-2.5">
          <div className="text-sm text-ink-faint">
            {/* Breadcrumb + global search land in later slices */}
            <span className="text-ink-muted">Search coming soon</span>
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-ink-muted hover:text-ink">Sign out</button>
          </form>
        </header>
        <div className="min-w-0 flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}
