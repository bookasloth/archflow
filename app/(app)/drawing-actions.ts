'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { allowedRevisionTransitions, isApproved, type RevisionStatus } from '@/lib/revision-status'

export async function createDrawing(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim()
  const projectId = String(formData.get('project_id'))
  if (!title || !projectId) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const opt = (k: string) => { const v = String(formData.get(k) ?? ''); return v || null }
  await supabase.from('drawings').insert({
    project_id: projectId,
    title,
    drawing_number: opt('drawing_number'),
    discipline: (opt('discipline') as never) ?? null,
    building_id: opt('building_id'),
    floor_id: opt('floor_id'),
    created_by: user!.id,
  })
  revalidatePath(`/projects/${projectId}/drawings`)
}

export async function createRevision(input: {
  drawingId: string; projectId: string; storagePath: string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: last } = await supabase
      .from('drawing_revisions')
      .select('revision_no')
      .eq('drawing_id', input.drawingId)
      .order('revision_no', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextNo = (last?.revision_no ?? 0) + 1
    const { error } = await supabase.from('drawing_revisions').insert({
      drawing_id: input.drawingId,
      revision_no: nextNo,
      storage_path: input.storagePath,
      uploaded_by: user!.id,
    })
    if (!error) break // success
    // 23505 = unique_violation: another upload took this number; retry once.
    if (error.code !== '23505' || attempt === 1) { console.error('createRevision failed:', JSON.stringify(error)); break }
  }
  revalidatePath(`/drawings/${input.drawingId}`)
}

export async function reviewRevision(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('revision_id'))
  const to = String(formData.get('to')) as RevisionStatus
  const { data: rev } = await supabase
    .from('drawing_revisions')
    .select('status, drawing_id')
    .eq('id', id)
    .single()
  if (!rev) return
  if (!allowedRevisionTransitions(rev.status as RevisionStatus).includes(to)) return

  const decided = ['approved', 'approved_with_comments', 'changes_requested', 'rejected'].includes(to)
  await supabase
    .from('drawing_revisions')
    .update({ status: to as never, decided_at: decided ? new Date().toISOString() : null })
    .eq('id', id)

  if (isApproved(to)) {
    // supersede any OTHER currently-approved revision of the same drawing
    await supabase
      .from('drawing_revisions')
      .update({ status: 'superseded' as never })
      .eq('drawing_id', rev.drawing_id)
      .neq('id', id)
      .in('status', ['approved', 'approved_with_comments'])
  }
  revalidatePath(`/drawings/${rev.drawing_id}`)
}

export async function signedDrawingUrl(path: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from('drawing-files').createSignedUrl(path, 3600)
  return data?.signedUrl ?? ''
}
