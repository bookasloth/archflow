import { createClient } from '@/lib/supabase/server'
import { NewDrawingForm } from '@/components/NewDrawingForm'
import { DrawingList } from '@/components/DrawingList'
import { DrawingFilters } from '@/components/DrawingFilters'
import { DrawingViewSwitcher } from '@/components/DrawingViewSwitcher'
import { DrawingKanban } from '@/components/DrawingKanban'
import { DrawingDrawer } from '@/components/DrawingDrawer'
import { PageHeader } from '@/components/ui/PageHeader'
import type { RevisionStatus } from '@/lib/revision-status'

type DrawingRow = {
  id: string; drawing_number: string | null; title: string; discipline: string | null
  drawing_revisions: { id: string; revision_no: number; status: string }[]
}

export default async function DrawingsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; discipline?: string; view?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('name').eq('id', id).single()
  const { data: rows } = await supabase
    .from('drawings')
    .select('id, drawing_number, title, discipline, drawing_revisions(id, revision_no, status)')
    .eq('project_id', id)
    .order('created_at')

  const drawings = ((rows as unknown as DrawingRow[]) ?? []).map((d) => {
    const latest = [...(d.drawing_revisions ?? [])].sort((a, b) => b.revision_no - a.revision_no)[0]
    return {
      id: d.id, drawing_number: d.drawing_number, title: d.title, discipline: d.discipline,
      latestNo: latest?.revision_no ?? null,
      latestStatus: (latest?.status ?? null) as RevisionStatus | null,
      latestRevId: latest?.id ?? null,
    }
  })

  const isKanban = sp.view === 'kanban'
  // Discipline filter applies to both views; the status filter only makes sense in
  // the table (Kanban groups by status, so it shows every column).
  const byDiscipline = drawings.filter((d) => !sp.discipline || d.discipline === sp.discipline)
  const tableRows = byDiscipline.filter((d) => !sp.status || d.latestStatus === sp.status)

  return (
    <main className="space-y-4">
      <PageHeader title={`${project?.name ?? 'Project'} — Drawings`} />
      <NewDrawingForm projectId={id} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DrawingFilters />
        <DrawingViewSwitcher />
      </div>
      {isKanban ? <DrawingKanban drawings={byDiscipline} /> : <DrawingList drawings={tableRows} />}
      <DrawingDrawer />
    </main>
  )
}
