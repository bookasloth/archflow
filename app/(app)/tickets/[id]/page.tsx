import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signedUrl } from '@/app/(app)/media-actions'
import { StatusControl } from '@/components/StatusControl'
import { BeforeAfter } from '@/components/BeforeAfter'
import { CommentThread } from '@/components/CommentThread'
import { AddPhoto } from '@/components/AddPhoto'
import type { TicketType, TicketStatus } from '@/lib/status'
import type { Marker } from '@/components/PhotoMarker'

type AttachmentRow = {
  id: string
  storage_path: string
  kind: string
  issue_markers: { x: number; y: number; label: string | null }[]
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: t } = await supabase
    .from('tickets')
    .select('id, seq, type, discipline, title, description, status, priority, due_date, project_id')
    .eq('id', id)
    .single()
  if (!t) notFound()

  const { data: atts } = await supabase
    .from('attachments')
    .select('id, storage_path, kind, issue_markers(x, y, label)')
    .eq('ticket_id', id)

  const photos = await Promise.all(
    ((atts as unknown as AttachmentRow[]) ?? []).map(async (a) => ({
      url: await signedUrl(a.storage_path),
      markers: (a.issue_markers ?? []) as Marker[],
      kind: a.kind,
    })),
  )
  const before = photos.filter((p) => p.kind === 'before')
  const after = photos.filter((p) => p.kind === 'after')

  const { data: comments } = await supabase
    .from('comments')
    .select('id, body, created_at, profiles(full_name)')
    .eq('ticket_id', id)
    .order('created_at')

  return (
    <main className="max-w-3xl space-y-5">
      <div>
        <div className="font-mono text-xs text-gray-500">
          {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
        </div>
        <h1 className="text-xl font-semibold">{t.title}</h1>
        <div className="mt-1 flex gap-3 text-xs text-gray-500">
          <span>{t.discipline}</span>
          <span>{t.priority}</span>
          {t.due_date && <span>due {t.due_date}</span>}
        </div>
      </div>
      {t.description && <p className="text-sm">{t.description}</p>}
      <StatusControl id={t.id} type={t.type as TicketType} status={t.status as TicketStatus} />
      {t.type === 'site_issue' ? (
        <div className="space-y-3">
          <BeforeAfter before={before} after={after} />
          <AddPhoto ticketId={t.id} projectId={t.project_id} kind="after" />
        </div>
      ) : (
        photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={p.url} alt="" className="max-w-full rounded" />
        ))
      )}
      <CommentThread
        ticketId={t.id}
        comments={((comments as unknown as {
          id: string
          body: string
          created_at: string
          profiles: { full_name: string | null } | null
        }[]) ?? []).map((c) => ({
          id: c.id,
          body: c.body,
          created_at: c.created_at,
          author: c.profiles?.full_name ?? null,
        }))}
      />
    </main>
  )
}
