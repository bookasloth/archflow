import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="font-semibold">Archflow</Link>
          <Link href="/site">Site Visit</Link>
        </nav>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-gray-500">Sign out</button>
        </form>
      </header>
      <div className="p-4">{children}</div>
    </div>
  )
}
