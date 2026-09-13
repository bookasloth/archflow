import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HierarchySidebar } from '@/components/HierarchySidebar'
import { TicketList } from '@/components/TicketList'
import { TicketFilters } from '@/components/TicketFilters'
import { ViewSwitcher } from '@/components/ViewSwitcher'
import { ViewControls } from '@/components/ViewControls'
import { CalendarView } from '@/components/CalendarView'
import { TimelineView } from '@/components/TimelineView'
import { KanbanBoard } from '@/components/KanbanBoard'
import { TicketDrawer } from '@/components/TicketDrawer'
import { NewTicketForm } from '@/components/NewTicketForm'
import { formatRevision } from '@/lib/revision-status'
import type { RevisionOption } from '@/components/DrawingRevisionSelect'

export default async function ProjectWorkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    status?: string; discipline?: string; view?: string; ktype?: string; ticket?: string
    q?: string; priority?: string; assignee?: string; building?: string; floor?: string; room?: string
  }>
}) {
  const { id } = await params
  const sp = await searchParams
  const view = ['kanban', 'calendar', 'timeline'].includes(sp.view ?? '') ? sp.view! : 'table'
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('name, code').eq('id', id).single()
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name, floors(id, name, rooms(id, name))')
    .eq('project_id', id)
  const { data: profiles } = await supabase.from('profiles').select('id, full_name').order('full_name')

  let q = supabase
    .from('tickets')
    .select('id, seq, type, discipline, title, status, priority, due_date, start_date, assignee:assignee_id(full_name), building:building_id(name), floor:floor_id(name), room:room_id(name)')
    .eq('project_id', id)
    .order('seq', { ascending: false })
  if (sp.status && view === 'table') q = q.eq('status', sp.status as never)
  if (sp.discipline) q = q.eq('discipline', sp.discipline as never)
  if (sp.priority) q = q.eq('priority', sp.priority as never)
  if (sp.assignee) q = q.eq('assignee_id', sp.assignee)
  if (sp.building) q = q.eq('building_id', sp.building)
  if (sp.floor) q = q.eq('floor_id', sp.floor)
  if (sp.room) q = q.eq('room_id', sp.room)
  if (sp.q) q = q.ilike('title', `%${sp.q}%`)
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

  const { data: materialRows } = await supabase
    .from('materials')
    .select('id, name')
    .eq('project_id', id)
    .order('name')
  const materials = ((materialRows as { id: string; name: string }[]) ?? [])
    .map((m) => ({ id: m.id, label: m.name }))

  return (
    <main className="flex gap-6">
      <HierarchySidebar projectId={id} buildings={(buildings as never) ?? []} />
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{project?.name}</h1>
          <Link href={`/projects/${id}/drawings`} className="text-sm text-ink-muted hover:text-ink">Drawings →</Link>
          <Link href={`/projects/${id}/materials`} className="text-sm text-ink-muted hover:text-ink">Materials →</Link>
          <Link href={`/projects/${id}/docs`} className="text-sm text-ink-muted hover:text-ink">Docs →</Link>
        </div>
        <NewTicketForm projectId={id} revisionOptions={revisionOptions} materials={materials} />
        <div className="flex items-center justify-between">
          <TicketFilters
            assignees={(profiles as { id: string; full_name: string | null }[]) ?? []}
            buildings={(buildings as never) ?? []}
          />
          <div className="flex items-center gap-1">
            {view === 'table' && <ViewControls />}
            <ViewSwitcher />
          </div>
        </div>
        {view === 'kanban' && <KanbanBoard tickets={(tickets as never) ?? []} />}
        {view === 'calendar' && <CalendarView tickets={(tickets as never) ?? []} />}
        {view === 'timeline' && <TimelineView tickets={(tickets as never) ?? []} />}
        {view === 'table' && <TicketList tickets={(tickets as never) ?? []} />}
        <TicketDrawer />
      </div>
    </main>
  )
}
