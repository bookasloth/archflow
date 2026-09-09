'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canTransition, type TicketType, type TicketStatus } from '@/lib/status'
import { signedUrl } from '@/app/(app)/media-actions'

export async function createProject(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('projects').insert({
    name,
    code: String(formData.get('code') ?? '') || null,
    client_name: String(formData.get('client_name') ?? '') || null,
    created_by: user!.id,
  })
  revalidatePath('/')
}

export async function addBuilding(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('buildings').insert({
    project_id: String(formData.get('project_id')),
    name: String(formData.get('name')).trim(),
  })
  revalidatePath(`/projects/${formData.get('project_id')}`)
}

export async function addFloor(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('floors').insert({
    building_id: String(formData.get('building_id')),
    name: String(formData.get('name')).trim(),
  })
  revalidatePath(`/projects/${formData.get('project_id')}`)
}

export async function addRoom(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('rooms').insert({
    floor_id: String(formData.get('floor_id')),
    name: String(formData.get('name')).trim(),
  })
  revalidatePath(`/projects/${formData.get('project_id')}`)
}

export async function createTicket(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim()
  if (!title) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const opt = (k: string) => {
    const v = String(formData.get(k) ?? '')
    return v || null
  }
  await supabase.from('tickets').insert({
    project_id: String(formData.get('project_id')),
    building_id: opt('building_id'),
    floor_id: opt('floor_id'),
    room_id: opt('room_id'),
    type: (String(formData.get('type')) as TicketType) || 'task',
    discipline: String(formData.get('discipline')) as never,
    title,
    priority: (String(formData.get('priority')) || 'medium') as never,
    due_date: opt('due_date'),
    drawing_id: opt('drawing_id'),
    drawing_revision_id: opt('drawing_revision_id'),
    reporter_id: user!.id,
  })
  revalidatePath(`/projects/${formData.get('project_id')}`, 'layout')
}

export async function changeStatus(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const id = String(formData.get('ticket_id'))
  const to = String(formData.get('to')) as TicketStatus
  const { data: t } = await supabase
    .from('tickets')
    .select('type, status, project_id')
    .eq('id', id)
    .single()
  if (!t) return { ok: false, error: 'Ticket not found' }
  const { count } = await supabase
    .from('attachments')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_id', id)
    .eq('kind', 'after')
  const ok = canTransition(t.type as TicketType, t.status as TicketStatus, to, {
    hasAfterPhoto: (count ?? 0) > 0,
  })
  if (!ok) {
    return {
      ok: false,
      error:
        to === 'verified'
          ? 'Cannot verify without an after-photo.'
          : `Cannot move from ${t.status} to ${to}.`,
    }
  }
  await supabase.from('tickets').update({ status: to }).eq('id', id)
  revalidatePath(`/tickets/${id}`)
  revalidatePath(`/projects/${t.project_id}`, 'layout')
  return { ok: true }
}

export async function changeStatusForm(formData: FormData): Promise<void> {
  await changeStatus(formData)
}

export async function addComment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const id = String(formData.get('ticket_id'))
  const body = String(formData.get('body') ?? '').trim()
  if (!body) return
  await supabase.from('comments').insert({ ticket_id: id, author_id: user!.id, body })
  revalidatePath(`/tickets/${id}`)
}

export async function getTicketDetail(id: string) {
  const supabase = await createClient()
  const { data: t } = await supabase
    .from('tickets')
    .select('id, seq, type, discipline, title, description, status, priority, due_date, project_id, drawing_id')
    .eq('id', id)
    .single()
  if (!t) return null

  const { data: atts } = await supabase
    .from('attachments')
    .select('id, storage_path, kind, issue_markers(x, y, label)')
    .eq('ticket_id', id)
  type AttRow = {
    storage_path: string
    kind: string
    issue_markers: { x: number; y: number; label: string | null }[]
  }
  const photos = await Promise.all(
    ((atts as unknown as AttRow[]) ?? []).map(async (a) => ({
      url: await signedUrl(a.storage_path),
      markers: a.issue_markers ?? [],
      kind: a.kind,
    })),
  )

  const { data: comments } = await supabase
    .from('comments')
    .select('id, body, created_at, profiles(full_name)')
    .eq('ticket_id', id)
    .order('created_at')
  type CmtRow = {
    id: string; body: string; created_at: string
    profiles: { full_name: string | null } | null
  }
  const mapped = ((comments as unknown as CmtRow[]) ?? []).map((c) => ({
    id: c.id, body: c.body, created_at: c.created_at,
    author: c.profiles?.full_name ?? null,
  }))

  return { ...t, photos, comments: mapped }
}
