import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatRevision } from '@/lib/revision-status'

// Cross-project inbox of everything awaiting a decision:
//   drawing revisions in `under_review` + materials in `proposed`.
// Derived on read — no notifications table (a single-firm tool doesn't need push/email yet).

type RevRow = {
  id: string; revision_no: number; drawing_id: string
  drawings: { title: string; project_id: string; projects: { name: string } | null } | null
}
type MatRow = {
  id: string; name: string; project_id: string; projects: { name: string } | null
}

export default async function ApprovalsPage() {
  const supabase = await createClient()

  const [rv, mt] = await Promise.all([
    supabase
      .from('drawing_revisions')
      .select('id, revision_no, drawing_id, drawings(title, project_id, projects(name))')
      .eq('status', 'under_review')
      .order('created_at', { ascending: false }),
    supabase
      .from('materials')
      .select('id, name, project_id, projects(name)')
      .eq('status', 'proposed')
      .order('created_at', { ascending: false }),
  ])

  const revisions = ((rv.data as unknown as RevRow[]) ?? []).filter((r) => r.drawings)
  const materials = (mt.data as unknown as MatRow[]) ?? []
  const total = revisions.length + materials.length

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Approvals" meta={<span>{total} awaiting a decision across your projects</span>} />

      {total === 0 && (
        <EmptyState title="Nothing awaiting approval" description="Drawing revisions under review and proposed materials will appear here." />
      )}

      {revisions.length > 0 && (
        <Section title={`Drawing revisions · ${revisions.length}`}>
          <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
            {revisions.map((r) => (
              <li key={r.id} className="hover:bg-surface-hover">
                <Link href={`/drawings/${r.drawing_id}`} className="flex items-center justify-between gap-3 p-2.5">
                  <span className="truncate text-ink">
                    {formatRevision(r.revision_no)} · {r.drawings!.title}
                  </span>
                  <span className="shrink-0 text-xs text-ink-faint">{r.drawings!.projects?.name ?? ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {materials.length > 0 && (
        <Section title={`Materials · ${materials.length}`}>
          <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
            {materials.map((m) => (
              <li key={m.id} className="hover:bg-surface-hover">
                <Link href={`/materials/${m.id}`} className="flex items-center justify-between gap-3 p-2.5">
                  <span className="truncate text-ink">{m.name}</span>
                  <span className="shrink-0 text-xs text-ink-faint">{m.projects?.name ?? ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
