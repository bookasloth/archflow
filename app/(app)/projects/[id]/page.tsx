import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HierarchySidebar } from '@/components/HierarchySidebar'
import { TicketList } from '@/components/TicketList'
import { TicketFilters } from '@/components/TicketFilters'
import { ViewSwitcher } from '@/components/ViewSwitcher'
import { KanbanBoard } from '@/components/KanbanBoard'
import { TicketDrawer } from '@/components/TicketDrawer'
import { NewTicketForm } from '@/components/NewTicketForm'
import { formatRevision } from '@/lib/revision-status'
import type { RevisionOption } from '@/components/DrawingRevisionSelect'

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string; discipline?: string; view?: string; ktype?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const view = sp.view === 'kanban' ? 'kanban' : 'table'
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('name, code').eq('id', id).single()
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name, floors(id, name, rooms(id, name))')
    .eq('project_id', id)

  let q = supabase
    .from('tickets')
    .select('id, seq, type, discipline, title, status, priority, due_date, assignee:assignee_id(full_name)')
    .eq('project_id', id)
    .order('seq', { ascending: false })
  if (sp.status && view === 'table') q = q.eq('status', sp.status as never)
  if (sp.discipline) q = q.eq('discipline', sp.discipline as never)
  const { data: tickets } = await q

  const { data: drawingRows } = await supabase
    .from('drawings')
    .select('id, title, drawing_revisions(id, revision_no)')
    .eq('project_id', id)
  type DR = { id: string; title: string; drawing_revisions: { id: string; revision_no: number }[] }
  const revisionOptions: RevisionOption[] = ((drawingRows as unknown as DR[]) ?? []).flatMap((d) =>
    (d.drawing_revisions ?? []).map((r) => ({
      revisionId: r.id, drawingId: d.id, label: `${d.title} ${formatRevision(r.revision_no)}`,
    })),
  )

  return (
    <main className="flex gap-6">
      <HierarchySidebar projectId={id} buildings={(buildings as never) ?? []} />
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{project?.name}</h1>
          <Link href={`/projects/${id}/drawings`} className="text-sm text-gray-500">Drawings →</Link>
          <Link href={`/projects/${id}/materials`} className="text-sm text-gray-500">Materials →</Link>
        </div>
        <NewTicketForm projectId={id} revisionOptions={revisionOptions} />
        <div className="flex items-center justify-between">
          <TicketFilters />
          <ViewSwitcher />
        </div>
        {view === 'kanban' ? (
          <KanbanBoard tickets={(tickets as never) ?? []} />
        ) : (
          <TicketList tickets={(tickets as never) ?? []} />
        )}
        <TicketDrawer />
      </div>
    </main>
  )
}
