'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function signedUrl(path: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from('ticket-media').createSignedUrl(path, 3600)
  return data?.signedUrl ?? ''
}

export async function saveAttachment(input: {
  ticketId: string
  projectId: string
  storagePath: string
  kind: 'before' | 'after' | 'reference'
  markers: { x: number; y: number; label: string | null }[]
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: att } = await supabase
    .from('attachments')
    .insert({
      ticket_id: input.ticketId,
      storage_path: input.storagePath,
      kind: input.kind,
      uploaded_by: user!.id,
    })
    .select('id')
    .single()
  if (att && input.markers.length) {
    await supabase.from('issue_markers').insert(
      input.markers.map((m) => ({ attachment_id: att.id, x: m.x, y: m.y, label: m.label })),
    )
  }
  revalidatePath(`/tickets/${input.ticketId}`)
  revalidatePath(`/projects/${input.projectId}`)
}

export async function createSiteIssue(input: {
  projectId: string
  title: string
  discipline: string
  priority: string
}): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('tickets')
    .insert({
      project_id: input.projectId,
      type: 'site_issue',
      discipline: input.discipline as never,
      title: input.title,
      priority: input.priority as never,
      reporter_id: user!.id,
    })
    .select('id')
    .single()
  return data!.id
}
