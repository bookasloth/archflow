'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { canManageRoles, type Role } from '@/lib/permissions'

export async function setUserRole(formData: FormData) {
  const { user, role } = await getCurrentUserWithRole()
  if (!user || !canManageRoles(role)) return // RLS also enforces this
  const targetId = String(formData.get('user_id'))
  const to = String(formData.get('to')) as Role
  if (to !== 'staff' && to !== 'admin') return
  // Don't let an admin demote themselves — avoids locking the workspace out of role management.
  if (targetId === user.id && to === 'staff') return
  const supabase = await createClient()
  await supabase.from('profiles').update({ role: to as never }).eq('id', targetId)
  revalidatePath('/admin/users')
}
