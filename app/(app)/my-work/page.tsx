import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import type { TicketStatus } from '@/lib/status'
import type { Priority } from '@/lib/health'

type Row = {
  id: string
  seq: number
  type: string
  title: string
  status: string
  priority: string
  due_date: string | null
  project_id: string
  project: { name: string } | null
}

export default async function MyWorkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('tickets')
    .select('id, seq, type, title, status, priority, due_date, project_id, project:project_id(name)')
    .eq('assignee_id', user?.id ?? '')
    .order('due_date', { ascending: true, nullsFirst: false })
  const rows = (data as unknown as Row[]) ?? []

  const iso = new Date().toISOString().slice(0, 10)
  const done = (s: string) => s === 'closed' || s === 'verified'
  const openish = (r: Row) => !done(r.status)

  const overdue = rows.filter((r) => openish(r) && r.due_date && r.due_date < iso)
  const dueToday = rows.filter((r) => openish(r) && r.due_date === iso)
  const open = rows.filter(
    (r) => openish(r) && !(r.due_date && r.due_date < iso) && r.due_date !== iso,
  )
  const completed = rows.filter((r) => done(r.status)).slice(0, 8)

  const Rows = ({ items }: { items: Row[] }) => (
    <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
      {items.map((r) => (
        <li key={r.id} className="hover:bg-surface-hover">
          <Link
            href={`/projects/${r.project_id}/work?ticket=${r.id}`}
            className="flex items-center justify-between gap-3 p-2.5 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-xs text-ink-faint">
                {(r.type === 'site_issue' ? 'SITE-' : 'TASK-') + r.seq}
              </span>
              <span className="truncate text-ink">{r.title}</span>
              <span className="shrink-0 text-xs text-ink-faint">{r.project?.name ?? ''}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <PriorityBadge priority={r.priority as Priority} />
              <StatusBadge status={r.status as TicketStatus} />
              {r.due_date && <span className="text-xs text-ink-muted">{r.due_date}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )

  const total = overdue.length + dueToday.length + open.length + completed.length

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="My Work" meta={<span>Assigned to you across all projects</span>} />
      {total === 0 ? (
        <EmptyState title="Nothing assigned to you" description="Tickets assigned to you will show up here, grouped by what's due." />
      ) : (
        <div className="space-y-5">
          {overdue.length > 0 && <Section title={`Overdue · ${overdue.length}`}><Rows items={overdue} /></Section>}
          {dueToday.length > 0 && <Section title={`Due today · ${dueToday.length}`}><Rows items={dueToday} /></Section>}
          {open.length > 0 && <Section title={`Open · ${open.length}`}><Rows items={open} /></Section>}
          {completed.length > 0 && <Section title="Recently completed"><Rows items={completed} /></Section>}
        </div>
      )}
    </div>
  )
}
