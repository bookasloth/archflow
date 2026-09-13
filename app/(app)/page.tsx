import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeHealth, type HealthTicket } from '@/lib/health'
import { ticketCounts } from '@/lib/portfolio'
import { HealthDot } from '@/components/HealthDot'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/EmptyState'
import { NewProjectForm } from '@/components/NewProjectForm'

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').maybeSingle()
  const firstName = (me?.full_name ?? '').split(' ')[0]

  const { data: projects } = await supabase.from('projects').select('id, name, code').order('created_at')
  const { data: tickets } = await supabase.from('tickets').select('project_id, type, status, priority, due_date')
  const { data: mine } = await supabase
    .from('tickets')
    .select('id, seq, type, title, status, project_id, due_date')
    .eq('assignee_id', user?.id ?? '')
    .in('status', ['open', 'in_progress'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(6)

  const today = new Date()
  const iso = today.toISOString().slice(0, 10)
  const byProject = new Map<string, HealthTicket[]>()
  for (const t of tickets ?? []) {
    const arr = byProject.get(t.project_id) ?? []
    arr.push(t as HealthTicket); byProject.set(t.project_id, arr)
  }
  type Mine = { id: string; seq: number; type: string; title: string; status: string; project_id: string; due_date: string | null }
  const myTasks = (mine as Mine[]) ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-ink">{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-sm text-ink-muted">Here’s what needs you across the workspace.</p>
      </div>

      <Section title="My open work" actions={<Link href="/my-work" className="text-xs text-ink-muted hover:text-ink">View all →</Link>}>
        {myTasks.length === 0 ? (
          <EmptyState title="Nothing assigned to you" description="Tickets assigned to you and still open appear here." />
        ) : (
          <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
            {myTasks.map((t) => (
              <li key={t.id} className="hover:bg-surface-hover">
                <Link href={`/projects/${t.project_id}/work?ticket=${t.id}`} className="flex items-center gap-2 p-2.5">
                  <span className="font-mono text-xs text-ink-faint">{(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}</span>
                  <span className="truncate text-ink">{t.title}</span>
                  {t.due_date && <span className="ml-auto shrink-0 text-xs text-ink-faint">due {t.due_date}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Projects">
        {(projects ?? []).length === 0 ? (
          <EmptyState title="No projects yet" description="Create your first project to start tracking work, drawings and site issues." />
        ) : (
          <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
            {(projects ?? []).map((p) => {
              const list = byProject.get(p.id) ?? []
              const c = ticketCounts(list, iso)
              return (
                <li key={p.id} className="hover:bg-surface-hover">
                  <Link href={`/projects/${p.id}`} className="flex items-center gap-3 p-3">
                    <HealthDot health={computeHealth(list, today)} />
                    <span className="font-medium text-ink">{p.name}</span>
                    {p.code && <span className="font-mono text-xs text-ink-faint">{p.code}</span>}
                    <span className="ml-auto shrink-0 text-xs text-ink-faint">
                      {c.overdue > 0 && <span className="text-danger">{c.overdue} overdue · </span>}
                      {c.openSite} open site
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="New project">
        <div className="rounded-lg border border-subtle bg-surface p-4">
          <NewProjectForm />
        </div>
      </Section>
    </div>
  )
}
