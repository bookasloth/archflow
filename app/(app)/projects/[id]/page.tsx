import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { HealthDot } from '@/components/HealthDot'
import { FavoriteButton } from '@/components/FavoriteButton'
import { TrackView } from '@/components/TrackView'
import { computeHealth, type HealthTicket } from '@/lib/health'

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('name, code').eq('id', id).single()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: favRow } = await supabase.from('favorites').select('entity_id')
    .match({ user_id: user?.id ?? '', entity_type: 'project', entity_id: id }).maybeSingle()
  const isFav = !!favRow
  const { data: tickets } = await supabase
    .from('tickets')
    .select('type, status, priority, due_date')
    .eq('project_id', id)
  const { data: pendingRevs } = await supabase
    .from('drawing_revisions')
    .select('id, drawings!inner(project_id)')
    .eq('status', 'under_review')
    .eq('drawings.project_id', id)
  const { data: proposedMats } = await supabase
    .from('materials')
    .select('id')
    .eq('project_id', id)
    .eq('status', 'proposed')

  const today = new Date()
  const iso = today.toISOString().slice(0, 10)
  const list = (tickets as HealthTicket[]) ?? []
  const openish = (s: string) => s === 'open' || s === 'in_progress'
  const isOverdue = (t: HealthTicket) =>
    !!t.due_date && t.due_date < iso && !['closed', 'verified'].includes(t.status)

  const work = {
    open: list.filter((t) => t.type === 'task' && openish(t.status)).length,
    overdue: list.filter((t) => t.type === 'task' && isOverdue(t)).length,
    critical: list.filter((t) => t.type === 'task' && t.priority === 'critical' && openish(t.status)).length,
  }
  const site = {
    open: list.filter((t) => t.type === 'site_issue' && openish(t.status)).length,
    awaitingVerification: list.filter((t) => t.type === 'site_issue' && t.status === 'resolved').length,
  }
  const drawingsPending = (pendingRevs as { id: string }[] | null)?.length ?? 0
  const materialsPending = (proposedMats as { id: string }[] | null)?.length ?? 0
  const health = computeHealth(list, today)

  const stat = (n: number, label: string) => (
    <div className="flex items-baseline gap-1.5">
      <span className="font-heading text-lg font-semibold text-ink">{n}</span>
      <span className="text-xs text-ink-muted">{label}</span>
    </div>
  )

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={project?.name ?? 'Project'}
        meta={
          <>
            {project?.code && <span className="font-mono text-ink-faint">{project.code}</span>}
            <span className="inline-flex items-center gap-1.5">
              <HealthDot health={health} />
              <span className="capitalize">{health === 'red' ? 'At risk' : health === 'yellow' ? 'Needs attention' : 'On track'}</span>
            </span>
          </>
        }
        actions={
          <>
            <FavoriteButton entityType="project" entityId={id} initial={isFav} />
            <Link
              href={`/projects/${id}/work`}
              className="inline-flex h-9 items-center rounded bg-primary px-3.5 text-sm font-medium text-primary-fg hover:bg-primary-hover"
            >
              Open work
            </Link>
          </>
        }
      />
      <TrackView entityType="project" entityId={id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Work" actions={<Link href={`/projects/${id}/work`} className="text-xs text-ink-muted hover:text-ink">View →</Link>}>
          <div className="flex flex-wrap gap-5 rounded-lg border border-subtle bg-surface p-4">
            {stat(work.open, 'open')}
            {stat(work.overdue, 'overdue')}
            {stat(work.critical, 'critical')}
          </div>
        </Section>

        <Section title="Drawings" actions={<Link href={`/projects/${id}/drawings`} className="text-xs text-ink-muted hover:text-ink">View →</Link>}>
          <div className="flex flex-wrap gap-5 rounded-lg border border-subtle bg-surface p-4">
            {stat(drawingsPending, 'awaiting approval')}
          </div>
        </Section>

        <Section title="Site issues" actions={<Link href={`/projects/${id}/work?ktype=site_issue&view=kanban`} className="text-xs text-ink-muted hover:text-ink">View →</Link>}>
          <div className="flex flex-wrap gap-5 rounded-lg border border-subtle bg-surface p-4">
            {stat(site.open, 'open')}
            {stat(site.awaitingVerification, 'awaiting verification')}
          </div>
        </Section>

        <Section title="Materials" actions={<Link href={`/projects/${id}/materials`} className="text-xs text-ink-muted hover:text-ink">View →</Link>}>
          <div className="flex flex-wrap gap-5 rounded-lg border border-subtle bg-surface p-4">
            {stat(materialsPending, 'pending decisions')}
          </div>
        </Section>
      </div>
    </div>
  )
}
