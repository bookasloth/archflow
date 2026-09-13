'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Block } from '@/lib/blocks'

// Create a doc (workspace page if no project_id) and open it.
export async function createDocument(formData: FormData) {
  const projectId = String(formData.get('project_id') ?? '') || null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('documents')
    .insert({ project_id: projectId, title: 'Untitled', content: [], created_by: user!.id })
    .select('id').single()
  if (projectId) revalidatePath(`/projects/${projectId}/docs`)
  else revalidatePath('/docs')
  if (data?.id) redirect(`/docs/${data.id}`)
}

// Persist title + blocks. Called (debounced) from the editor.
export async function updateDocument(id: string, title: string, content: Block[]): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('documents')
    .update({ title, content: content as never, updated_at: new Date().toISOString() })
    .eq('id', id)
}

export async function deleteDocument(id: string, projectId: string | null) {
  const supabase = await createClient()
  await supabase.from('documents').delete().eq('id', id) // RLS: admins only
  redirect(projectId ? `/projects/${projectId}/docs` : '/docs')
}
