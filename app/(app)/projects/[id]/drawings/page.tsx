import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewDrawingForm } from '@/components/NewDrawingForm'
import { DrawingList } from '@/components/DrawingList'
import { DrawingFilters } from '@/components/DrawingFilters'

type DrawingRow = {
  id: string; drawing_number: string | null; title: string; discipline: string | null
  drawing_revisions: { revision_no: number; status: string }[]
}

export default async function DrawingsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; discipline?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('name').eq('id', id).single()
  const { data: rows } = await supabase
    .from('drawings')
    .select('id, drawing_number, title, discipline, drawing_revisions(revision_no, status)')
    .eq('project_id', id)
    .order('created_at')

  const drawings = ((rows as unknown as DrawingRow[]) ?? []).map((d) => {
    const latest = [...(d.drawing_revisions ?? [])].sort((a, b) => b.revision_no - a.revision_no)[0]
    return {
      id: d.id, drawing_number: d.drawing_number, title: d.title, discipline: d.discipline,
      latestNo: latest?.revision_no ?? null, latestStatus: latest?.status ?? null,
    }
  })

  const filtered = drawings.filter((d) =>
    (!sp.discipline || d.discipline === sp.discipline) &&
    (!sp.status || d.latestStatus === sp.status),
  )

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{project?.name} — Drawings</h1>
        <Link href={`/projects/${id}`} className="text-sm text-gray-500">← project</Link>
      </div>
      <NewDrawingForm projectId={id} />
      <DrawingFilters />
      <DrawingList drawings={filtered} />
    </main>
  )
}
