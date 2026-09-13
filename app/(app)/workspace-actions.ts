'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type EntityType = 'project' | 'ticket' | 'drawing' | 'material' | 'document'

// Toggle a favorite for the current user. Returns the new favorited state.
// No revalidate — the button updates optimistically; the sidebar reconciles on next nav.
export async function toggleFavorite(entityType: EntityType, entityId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const match = { user_id: user.id, entity_type: entityType, entity_id: entityId }
  const { data: existing } = await supabase
    .from('favorites').select('entity_id')
    .match(match).maybeSingle()
  if (existing) {
    await supabase.from('favorites').delete().match(match)
    return false
  }
  await supabase.from('favorites').insert(match)
  return true
}

// Record that the user viewed an entity (upsert viewed_at). Fire-and-forget.
export async function recordView(entityType: EntityType, entityId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('recently_viewed').upsert(
    { user_id: user.id, entity_type: entityType, entity_id: entityId, viewed_at: new Date().toISOString() },
    { onConflict: 'user_id,entity_type,entity_id' },
  )
}

// Tags. createTag is idempotent on name (unique).
export async function createTag(name: string): Promise<string | null> {
  const n = name.trim()
  if (!n) return null
  const supabase = await createClient()
  const { data } = await supabase.from('tags').upsert({ name: n }, { onConflict: 'name' }).select('id').single()
  return data?.id ?? null
}

export async function addTicketTag(ticketId: string, tagId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('ticket_tags').upsert({ ticket_id: ticketId, tag_id: tagId })
  revalidatePath(`/tickets/${ticketId}`)
}

export async function removeTicketTag(ticketId: string, tagId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('ticket_tags').delete().match({ ticket_id: ticketId, tag_id: tagId })
  revalidatePath(`/tickets/${ticketId}`)
}
