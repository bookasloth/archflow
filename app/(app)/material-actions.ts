'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { nextMaterialStatuses, type MaterialStatus } from '@/lib/materials'

export async function createMaterial(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const projectId = String(formData.get('project_id'))
  if (!name || !projectId) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const opt = (k: string) => { const v = String(formData.get(k) ?? ''); return v || null }
  const costRaw = String(formData.get('cost') ?? '').trim()
  await supabase.from('materials').insert({
    project_id: projectId,
    room_id: opt('room_id'),
    drawing_id: opt('drawing_id'),
    category: String(formData.get('category')) as never,
    name,
    manufacturer: opt('manufacturer'),
    product_code: opt('product_code'),
    finish: opt('finish'),
    color: opt('color'),
    size: opt('size'),
    cost: costRaw ? Number(costRaw) : null,
    supplier: opt('supplier'),
    notes: opt('notes'),
    created_by: user!.id,
  })
  revalidatePath(`/projects/${projectId}/materials`)
}

export async function addMaterialAttachment(input: {
  materialId: string; projectId: string; storagePath: string; kind: 'photo' | 'datasheet'
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('material_attachments').insert({
    material_id: input.materialId,
    storage_path: input.storagePath,
    kind: input.kind,
    uploaded_by: user!.id,
  })
  revalidatePath(`/materials/${input.materialId}`)
}

export async function setMaterialStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const id = String(formData.get('material_id'))
  const to = String(formData.get('to')) as MaterialStatus
  const { data: m } = await supabase.from('materials').select('status').eq('id', id).single()
  if (!m) return
  if (!nextMaterialStatuses(m.status as MaterialStatus).includes(to)) return
  const decided = to === 'approved' || to === 'rejected'
  await supabase.from('materials').update({
    status: to as never,
    decided_at: decided ? new Date().toISOString() : null,
    decided_by: decided ? user!.id : null,
  }).eq('id', id)
  revalidatePath(`/materials/${id}`)
}

export async function signedMaterialUrl(path: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from('material-files').createSignedUrl(path, 3600)
  return data?.signedUrl ?? ''
}
