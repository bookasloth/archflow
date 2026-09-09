import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signedDrawingUrl } from '@/app/(app)/drawing-actions'
import { formatRevision, type RevisionStatus } from '@/lib/revision-status'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { RevisionBadge, DisciplineBadge } from '@/components/ui/Badge'
import { UploadRevision } from '@/components/UploadRevision'
import { RevisionHistory } from '@/components/RevisionHistory'
import { RevisionPreview } from '@/components/RevisionPreview'
import { TicketDrawer } from '@/components/TicketDrawer'
import type { Discipline } from '@/lib/labels'

type RevRow = {
  id: string; revision_no: number; status: RevisionStatus; storage_path: string
  created_at: string; profiles: { full_name: string | null } | null
}

export default async function DrawingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: d } = await supabase
    .from('drawings')
    .select('id, title, drawing_number, discipline, project_id')
    .eq('id', id)
    .single()
  if (!d) notFound()

  const { data: revRows } = await supabase
    .from('drawing_revisions')
    .select('id, revision_no, status, storage_path, created_at, profiles:uploaded_by(full_name)')
    .eq('drawing_id', id)
    .order('revision_no', { ascending: false })
  const revisions = (revRows as unknown as RevRow[]) ?? []
  const latest = revisions[0]
  const previewUrl = latest ? await signedDrawingUrl(latest.storage_path) : ''

  const { data: linked } = await supabase
    .from('tickets')
    .select('id, seq, type, title')
    .eq('drawing_id', id)
    .order('seq', { ascending: false })
  type LT = { id: string; seq: number; type: string; title: string }
  const linkedTickets = (linked as LT[]) ?? []

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title={
          <span className="flex items-baseline gap-2">
            {d.drawing_number && <span className="font-mono text-base text-ink-faint">{d.drawing_number}</span>}
            <span>{d.title}</span>
          </span>
        }
        meta={
          <>
            {d.discipline && <DisciplineBadge discipline={d.discipline as Discipline} />}
            {latest && <RevisionBadge status={latest.status} />}
            {latest && <span className="text-ink-faint">Current {formatRevision(latest.revision_no)}</span>}
          </>
        }
        actions={<Link href={`/projects/${d.project_id}/drawings`} className="text-sm text-ink-muted hover:text-ink">← Drawings</Link>}
      />

      <UploadRevision drawingId={d.id} projectId={d.project_id} />

      <Section title="Revision history">
        <RevisionHistory
          revisions={revisions.map((r) => ({
            id: r.id, revision_no: r.revision_no, status: r.status,
            created_at: r.created_at, uploader: r.profiles?.full_name ?? null,
          }))}
        />
      </Section>

      {latest && (
        <Section title={`Preview — ${formatRevision(latest.revision_no)}`}>
          <RevisionPreview url={previewUrl} path={latest.storage_path} />
        </Section>
      )}

      <Section title={`Linked tickets · ${linkedTickets.length}`}>
        {linkedTickets.length === 0 ? (
          <p className="text-sm text-ink-faint">None.</p>
        ) : (
          <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
            {linkedTickets.map((t) => (
              <li key={t.id} className="hover:bg-surface-hover">
                <Link href={`/drawings/${d.id}?ticket=${t.id}`} className="flex items-center gap-2 p-2.5">
                  <span className="font-mono text-xs text-ink-faint">
                    {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
                  </span>
                  <span className="truncate text-ink">{t.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <TicketDrawer />
    </div>
  )
}
