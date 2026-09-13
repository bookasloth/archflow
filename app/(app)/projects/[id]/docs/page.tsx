import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { createDocument } from '@/app/(app)/doc-actions'

type Doc = { id: string; title: string; updated_at: string }

export default async function ProjectDocsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('name').eq('id', id).single()
  const { data } = await supabase
    .from('documents').select('id, title, updated_at').eq('project_id', id)
    .order('updated_at', { ascending: false })
  const docs = (data as Doc[]) ?? []

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title={`${project?.name ?? 'Project'} — Docs`}
        actions={
          <form action={createDocument}>
            <input type="hidden" name="project_id" value={id} />
            <button className="inline-flex h-9 items-center rounded bg-primary px-3.5 text-sm font-medium text-primary-fg hover:bg-primary-hover">＋ New doc</button>
          </form>
        }
      />
      {docs.length === 0 ? (
        <EmptyState title="No docs yet" description="Project docs hold briefs, notes and decisions alongside the work." />
      ) : (
        <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
          {docs.map((d) => (
            <li key={d.id} className="hover:bg-surface-hover">
              <Link href={`/docs/${d.id}`} className="flex items-center justify-between gap-3 p-3">
                <span className="truncate text-ink">{d.title || 'Untitled'}</span>
                <span className="shrink-0 text-xs text-ink-faint">{d.updated_at.slice(0, 10)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
