'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { viaProxy } from '@/lib/supabase/proxy'
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

// Ungated status set for the Kanban board + drawer: moves a drawing's latest revision
// to ANY status (all-states-to-all-states). Still auto-supersedes other approved
// revisions and stamps decided_at for decisions. The comment-capable review flow on
// the drawing page (reviewRevision) stays the gated path.
export async function setRevisionStatus(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const id = String(formData.get('revision_id'))
  const to = String(formData.get('to')) as RevisionStatus
  const { data: rev } = await supabase
    .from('drawing_revisions')
    .select('status, drawing_id, drawings(project_id)')
    .eq('id', id)
    .single()
  if (!rev) return { ok: false, error: 'Revision not found' }
  if (rev.status === to) return { ok: true }

  const decided = ['approved', 'approved_with_comments', 'changes_requested', 'rejected'].includes(to)
  const { error } = await supabase
    .from('drawing_revisions')
    .update({ status: to as never, decided_at: decided ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  if (isApproved(to)) {
    await supabase
      .from('drawing_revisions')
      .update({ status: 'superseded' as never })
      .eq('drawing_id', rev.drawing_id)
      .neq('id', id)
      .in('status', ['approved', 'approved_with_comments'])
  }
  const projectId = (rev as unknown as { drawings: { project_id: string } | null }).drawings?.project_id
  revalidatePath(`/drawings/${rev.drawing_id}`)
  // Revalidating the register in the same action response = the board reconciles in
  // one round trip (no router.refresh, no card snapping back mid-move).
  if (projectId) revalidatePath(`/projects/${projectId}/drawings`)
  return { ok: true }
}

export async function signedDrawingUrl(path: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from('drawing-files').createSignedUrl(path, 3600)
  return viaProxy(data?.signedUrl ?? '')
}

// Lightweight detail for the drawing side-drawer (no signed file URL — the drawer
// is a quick glance; the full drawing page loads the preview).
export async function getDrawingDetail(id: string) {
  const supabase = await createClient()
  const [{ data: d }, { data: revRows }, { data: linked }] = await Promise.all([
    supabase.from('drawings').select('id, title, drawing_number, discipline, project_id').eq('id', id).single(),
    supabase
      .from('drawing_revisions')
      .select('id, revision_no, status, created_at, profiles:uploaded_by(full_name)')
      .eq('drawing_id', id)
      .order('revision_no', { ascending: false }),
    supabase.from('tickets').select('id, seq, type, title').eq('drawing_id', id).order('seq', { ascending: false }),
  ])
  if (!d) return null

  type RevRow = {
    id: string; revision_no: number; status: RevisionStatus; created_at: string
    profiles: { full_name: string | null } | null
  }
  const revisions = ((revRows as unknown as RevRow[]) ?? []).map((r) => ({
    id: r.id, revision_no: r.revision_no, status: r.status,
    created_at: r.created_at, uploader: r.profiles?.full_name ?? null,
  }))
  const linkedTickets = (linked as { id: string; seq: number; type: string; title: string }[]) ?? []

  return { ...d, revisions, linkedTickets }
}
