import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeHealth, type HealthTicket } from '@/lib/health'
import { HealthDot } from '@/components/HealthDot'
import { NewProjectForm } from '@/components/NewProjectForm'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from('projects').select('id, name, code').order('created_at')
  const { data: tickets } = await supabase
    .from('tickets')
    .select('project_id, type, status, priority, due_date')
  const { data: pendingRevs } = await supabase
    .from('drawing_revisions')
    .select('id, drawings(project_id)')
    .eq('status', 'under_review')
  type PR = { drawings: { project_id: string } | null }
  const pendingByProject = new Map<string, number>()
  for (const r of (pendingRevs as unknown as PR[]) ?? []) {
    const pid = r.drawings?.project_id
    if (pid) pendingByProject.set(pid, (pendingByProject.get(pid) ?? 0) + 1)
  }
  const { data: proposedMats } = await supabase
    .from('materials')
    .select('id, project_id')
    .eq('status', 'proposed')
  const materialsByProject = new Map<string, number>()
  for (const mm of (proposedMats as { project_id: string }[] | null) ?? []) {
    materialsByProject.set(mm.project_id, (materialsByProject.get(mm.project_id) ?? 0) + 1)
  }

  const today = new Date()
  const byProject = new Map<string, HealthTicket[]>()
  for (const t of tickets ?? []) {
    const arr = byProject.get(t.project_id) ?? []
    arr.push(t as HealthTicket)
    byProject.set(t.project_id, arr)
  }
  const iso = today.toISOString().slice(0, 10)
  const counts = (list: HealthTicket[]) => ({
    dueToday: list.filter((t) => t.due_date === iso).length,
    overdue: list.filter(
      (t) => t.due_date && t.due_date < iso && !['closed', 'verified'].includes(t.status),
    ).length,
    openSite: list.filter((t) => t.type === 'site_issue' && ['open', 'in_progress'].includes(t.status))
      .length,
  })

  return (
    <main className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">New project</h2>
        <NewProjectForm />
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Projects</h2>
        <ul className="divide-y rounded border">
          {(projects ?? []).map((p) => {
            const list = byProject.get(p.id) ?? []
            const c = counts(list)
            const pending = pendingByProject.get(p.id) ?? 0
            const matPending = materialsByProject.get(p.id) ?? 0
            return (
              <li key={p.id} className="flex items-center justify-between p-3">
                <Link href={`/projects/${p.id}`} className="flex items-center gap-2">
                  <HealthDot health={computeHealth(list, today)} />
                  <span className="font-medium">{p.name}</span>
                  {p.code && <span className="text-xs text-gray-500">{p.code}</span>}
                </Link>
                <span className="text-xs text-gray-500">
                  due today {c.dueToday} · overdue {c.overdue} · open site {c.openSite}
                  {` · pending approvals ${pending}`}
                  {` · materials pending ${matPending}`}
                </span>
              </li>
            )
          })}
          {(projects ?? []).length === 0 && (
            <li className="p-3 text-sm text-gray-500">No projects yet. Add one above.</li>
          )}
        </ul>
      </section>
    </main>
  )
}
