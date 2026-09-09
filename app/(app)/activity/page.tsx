import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatRevision } from '@/lib/revision-status'
import { revisionLabel } from '@/lib/labels'
import type { RevisionStatus } from '@/lib/revision-status'

type Item = { id: string; when: string; text: string; href: string }

export default async function ActivityPage() {
  const supabase = await createClient()

  const [tk, rv, mt, cm] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, seq, type, title, project_id, created_at')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('drawing_revisions')
      .select('id, revision_no, status, created_at, drawings(title, project_id)')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('materials')
      .select('id, name, status, project_id, created_at')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('comments')
      .select('id, created_at, ticket_id, profiles(full_name), tickets(seq, type, project_id)')
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const items: Item[] = []

  type Tk = { id: string; seq: number; type: string; title: string; project_id: string; created_at: string }
  for (const t of (tk.data as unknown as Tk[]) ?? []) {
    items.push({
      id: `t-${t.id}`,
      when: t.created_at,
      text: `New ${t.type === 'site_issue' ? 'SITE' : 'TASK'}-${t.seq} · ${t.title}`,
      href: `/projects/${t.project_id}/work?ticket=${t.id}`,
    })
  }

  type Rv = { id: string; revision_no: number; status: RevisionStatus; created_at: string; drawings: { title: string; project_id: string } | null }
  for (const r of (rv.data as unknown as Rv[]) ?? []) {
    if (!r.drawings) continue
    items.push({
      id: `r-${r.id}`,
      when: r.created_at,
      text: `${formatRevision(r.revision_no)} on ${r.drawings.title} · ${revisionLabel(r.status)}`,
      href: `/projects/${r.drawings.project_id}/drawings`,
    })
  }

  type Mt = { id: string; name: string; status: string; project_id: string; created_at: string }
  for (const m of (mt.data as unknown as Mt[]) ?? []) {
    items.push({
      id: `m-${m.id}`,
      when: m.created_at,
      text: `Material ${m.name} · ${m.status.replace(/_/g, ' ')}`,
      href: `/projects/${m.project_id}/materials`,
    })
  }

  type Cm = { id: string; created_at: string; ticket_id: string; profiles: { full_name: string | null } | null; tickets: { seq: number; type: string; project_id: string } | null }
  for (const c of (cm.data as unknown as Cm[]) ?? []) {
    if (!c.tickets) continue
    const who = c.profiles?.full_name ?? 'Someone'
    items.push({
      id: `c-${c.id}`,
      when: c.created_at,
      text: `${who} commented on ${c.tickets.type === 'site_issue' ? 'SITE' : 'TASK'}-${c.tickets.seq}`,
      href: `/projects/${c.tickets.project_id}/work?ticket=${c.ticket_id}`,
    })
  }

  items.sort((a, b) => (a.when < b.when ? 1 : a.when > b.when ? -1 : 0))
  const recent = items.slice(0, 30)

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Activity" meta={<span>Recent updates across your projects</span>} />
      {recent.length === 0 ? (
        <EmptyState title="No recent activity" description="Tickets, revisions, comments and material updates will appear here as work happens." />
      ) : (
        <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
          {recent.map((it) => (
            <li key={it.id} className="hover:bg-surface-hover">
              <Link href={it.href} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                <span className="truncate text-ink">{it.text}</span>
                <span className="shrink-0 text-xs text-ink-faint">{it.when.slice(0, 10)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
