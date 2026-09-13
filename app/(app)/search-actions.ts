'use server'
import { createClient } from '@/lib/supabase/server'

export type SearchHit = { id: string; kind: 'Project' | 'Ticket' | 'Drawing' | 'Material' | 'Page'; label: string; href: string }

// Cross-entity search for the command menu. ilike on the natural title field of each
// entity; a handful of results each. Read-only; RLS scopes what the caller can see.
export async function globalSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const like = `%${q}%`
  const supabase = await createClient()

  const [pr, tk, dr, mt, dc] = await Promise.all([
    supabase.from('projects').select('id, name').ilike('name', like).limit(5),
    supabase.from('tickets').select('id, seq, type, title, project_id').ilike('title', like).order('seq', { ascending: false }).limit(5),
    supabase.from('drawings').select('id, title, drawing_number').ilike('title', like).limit(5),
    supabase.from('materials').select('id, name').ilike('name', like).limit(5),
    supabase.from('documents').select('id, title').ilike('title', like).limit(5),
  ])

  const hits: SearchHit[] = []

  for (const p of (pr.data as { id: string; name: string }[]) ?? [])
    hits.push({ id: `p-${p.id}`, kind: 'Project', label: p.name, href: `/projects/${p.id}` })

  for (const t of (tk.data as { id: string; seq: number; type: string; title: string; project_id: string }[]) ?? [])
    hits.push({
      id: `t-${t.id}`, kind: 'Ticket',
      label: `${t.type === 'site_issue' ? 'SITE' : 'TASK'}-${t.seq} · ${t.title}`,
      href: `/projects/${t.project_id}/work?ticket=${t.id}`,
    })

  for (const d of (dr.data as { id: string; title: string; drawing_number: string | null }[]) ?? [])
    hits.push({
      id: `d-${d.id}`, kind: 'Drawing',
      label: d.drawing_number ? `${d.drawing_number} · ${d.title}` : d.title,
      href: `/drawings/${d.id}`,
    })

  for (const m of (mt.data as { id: string; name: string }[]) ?? [])
    hits.push({ id: `m-${m.id}`, kind: 'Material', label: m.name, href: `/materials/${m.id}` })

  for (const d of (dc.data as { id: string; title: string }[]) ?? [])
    hits.push({ id: `dc-${d.id}`, kind: 'Page', label: d.title || 'Untitled', href: `/docs/${d.id}` })

  return hits
}
