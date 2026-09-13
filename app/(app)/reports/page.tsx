import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeHealth, type HealthTicket } from '@/lib/health'
import { ticketCounts, healthTotals, type Health } from '@/lib/portfolio'
import { HealthDot } from '@/components/HealthDot'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

// Portfolio report: every project rolled up in one table + workspace totals.
// Reuses computeHealth + the shared ticketCounts helper (same numbers as the dashboard).
export default async function ReportsPage() {
  const supabase = await createClient()

  const [{ data: projects }, { data: tickets }, { data: pendingRevs }, { data: proposedMats }] = await Promise.all([
    supabase.from('projects').select('id, name, code').order('name'),
    supabase.from('tickets').select('project_id, type, status, priority, due_date'),
    supabase.from('drawing_revisions').select('id, drawings(project_id)').eq('status', 'under_review'),
    supabase.from('materials').select('id, project_id').eq('status', 'proposed'),
  ])

  const today = new Date()
  const iso = today.toISOString().slice(0, 10)

  const byProject = new Map<string, HealthTicket[]>()
  for (const t of tickets ?? []) {
    const arr = byProject.get(t.project_id) ?? []
    arr.push(t as HealthTicket)
    byProject.set(t.project_id, arr)
  }

  const pendingByProject = new Map<string, number>()
  type PR = { drawings: { project_id: string } | null }
  for (const r of (pendingRevs as unknown as PR[]) ?? []) {
    const pid = r.drawings?.project_id
    if (pid) pendingByProject.set(pid, (pendingByProject.get(pid) ?? 0) + 1)
  }
  const matByProject = new Map<string, number>()
  for (const m of (proposedMats as { project_id: string }[] | null) ?? []) {
    matByProject.set(m.project_id, (matByProject.get(m.project_id) ?? 0) + 1)
  }

  const rows = (projects ?? []).map((p) => {
    const list = byProject.get(p.id) ?? []
    return {
      ...p,
      health: computeHealth(list, today) as Health,
      counts: ticketCounts(list, iso),
      pending: pendingByProject.get(p.id) ?? 0,
      matPending: matByProject.get(p.id) ?? 0,
    }
  })

  const totals = healthTotals(rows.map((r) => r.health))
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((n, r) => n + f(r), 0)

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader title="Portfolio report" meta={<span>{rows.length} project{rows.length === 1 ? '' : 's'}</span>} />

      {rows.length === 0 ? (
        <EmptyState title="No projects yet" description="Create a project to see portfolio metrics here." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Health" value={`${totals.red} red · ${totals.yellow} yellow · ${totals.green} green`} />
            <Tile label="Overdue" value={sum((r) => r.counts.overdue)} />
            <Tile label="Open site issues" value={sum((r) => r.counts.openSite)} />
            <Tile label="Awaiting decision" value={sum((r) => r.pending + r.matPending)} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-subtle bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="p-2.5 font-medium">Project</th>
                  <th className="p-2.5 font-medium">Due today</th>
                  <th className="p-2.5 font-medium">Overdue</th>
                  <th className="p-2.5 font-medium">Open site</th>
                  <th className="p-2.5 font-medium">Approvals</th>
                  <th className="p-2.5 font-medium">Materials</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-subtle last:border-0 hover:bg-surface-hover">
                    <td className="p-2.5">
                      <Link href={`/projects/${r.id}`} className="flex items-center gap-2">
                        <HealthDot health={r.health} />
                        <span className="font-medium text-ink">{r.name}</span>
                        {r.code && <span className="text-xs text-ink-faint">{r.code}</span>}
                      </Link>
                    </td>
                    <td className="p-2.5 text-ink-muted">{r.counts.dueToday}</td>
                    <td className="p-2.5 text-ink-muted">{r.counts.overdue}</td>
                    <td className="p-2.5 text-ink-muted">{r.counts.openSite}</td>
                    <td className="p-2.5 text-ink-muted">{r.pending}</td>
                    <td className="p-2.5 text-ink-muted">{r.matPending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-3">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-ink">{value}</div>
    </div>
  )
}
