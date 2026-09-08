'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canTransition, type TicketType, type TicketStatus } from '@/lib/status'

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
  revalidatePath(`/projects/${formData.get('project_id')}`)
}

export async function changeStatus(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('ticket_id'))
  const to = String(formData.get('to')) as TicketStatus
  const { data: t } = await supabase.from('tickets').select('type, status').eq('id', id).single()
  if (!t) return
  const { count } = await supabase
    .from('attachments')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_id', id)
    .eq('kind', 'after')
  const ok = canTransition(t.type as TicketType, t.status as TicketStatus, to, {
    hasAfterPhoto: (count ?? 0) > 0,
  })
  if (!ok) return
  await supabase.from('tickets').update({ status: to }).eq('id', id)
  revalidatePath(`/tickets/${id}`)
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
