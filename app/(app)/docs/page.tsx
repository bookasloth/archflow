import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { createDocument } from '@/app/(app)/doc-actions'

type Doc = { id: string; title: string; updated_at: string }

export default async function DocsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('documents').select('id, title, updated_at').is('project_id', null)
    .order('updated_at', { ascending: false })
  const docs = (data as Doc[]) ?? []

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title="Workspace pages"
        actions={
          <form action={createDocument}>
            <button className="inline-flex h-9 items-center rounded bg-primary px-3.5 text-sm font-medium text-primary-fg hover:bg-primary-hover">＋ New page</button>
          </form>
        }
      />
      {docs.length === 0 ? (
        <EmptyState title="No pages yet" description="Workspace pages are free-form docs — notes, briefs, standards. Create one to start." />
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
