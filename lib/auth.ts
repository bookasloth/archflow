import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/permissions'
import type { User } from '@supabase/supabase-js'

// The one place that resolves the caller's role. Server-only.
// Defaults to 'staff' if the profile row is missing (the trigger always creates one).
export async function getCurrentUserWithRole(): Promise<{ user: User | null; role: Role | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, role: null }
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { user, role: (data?.role ?? 'staff') as Role }
}
