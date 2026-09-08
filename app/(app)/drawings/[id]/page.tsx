import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signedDrawingUrl } from '@/app/(app)/drawing-actions'
import { formatRevision, type RevisionStatus } from '@/lib/revision-status'
import { UploadRevision } from '@/components/UploadRevision'
import { RevisionHistory } from '@/components/RevisionHistory'
import { RevisionPreview } from '@/components/RevisionPreview'

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

  return (
    <main className="max-w-3xl space-y-5">
      <div>
        <Link href={`/projects/${d.project_id}/drawings`} className="text-sm text-gray-500">← drawings</Link>
        <h1 className="text-xl font-semibold">
          {d.drawing_number && <span className="font-mono text-gray-500">{d.drawing_number} </span>}
          {d.title}
        </h1>
        {d.discipline && <div className="text-xs text-gray-500">{d.discipline}</div>}
      </div>

      <UploadRevision drawingId={d.id} projectId={d.project_id} />

      <RevisionHistory
        revisions={revisions.map((r) => ({
          id: r.id, revision_no: r.revision_no, status: r.status,
          created_at: r.created_at, uploader: r.profiles?.full_name ?? null,
        }))}
      />

      {latest && (
        <section className="space-y-1">
          <h4 className="text-sm font-medium">Preview — {formatRevision(latest.revision_no)}</h4>
          <RevisionPreview url={previewUrl} path={latest.storage_path} />
        </section>
      )}

      <section className="space-y-1">
        <h4 className="text-sm font-medium">Linked tickets</h4>
        {(linked ?? []).length === 0 && <p className="text-sm text-gray-400">None.</p>}
        <ul className="text-sm">
          {(linked ?? []).map((t) => (
            <li key={t.id}>
              <Link href={`/tickets/${t.id}`} className="text-blue-600">
                {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq} {t.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
