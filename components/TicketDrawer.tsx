'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getTicketDetail } from '@/app/(app)/actions'
import { setSearchParams } from '@/lib/url-state'
import { Drawer, DrawerSkeleton } from '@/components/ui/Drawer'
import { StatusControl } from '@/components/StatusControl'
import { BeforeAfter } from '@/components/BeforeAfter'
import { AddPhoto } from '@/components/AddPhoto'
import { CommentThread } from '@/components/CommentThread'
import { TicketExtras } from '@/components/TicketExtras'
import type { TicketType, TicketStatus } from '@/lib/status'
import type { Marker } from '@/components/PhotoMarker'

type Detail = Awaited<ReturnType<typeof getTicketDetail>>

// Last-seen details: reopening a ticket paints instantly, then refreshes in the background.
// ponytail: unbounded per-tab Map — fine for a session's worth of tickets.
const cache = new Map<string, NonNullable<Detail>>()

export function TicketDrawer() {
  const id = useSearchParams().get('ticket')
  const [detail, setDetail] = useState<Detail>(null)
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!id) return
    let alive = true
    setDetail(cache.get(id) ?? null)
    setLoading(true)
    getTicketDetail(id)
      .then((d) => {
        if (!alive) return
        if (d) cache.set(id, d)
        setDetail(d)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id, reloadKey])

  if (!id) return null
  // Never flash the previous ticket while the next one loads.
  const shown = detail?.id === id ? detail : null
  const reload = () => setReloadKey((k) => k + 1)

  const before = shown?.photos.filter((p) => p.kind === 'before') ?? []
  const after = shown?.photos.filter((p) => p.kind === 'after') ?? []
  const isSite = shown?.type === 'site_issue'
  const needsAfterToVerify = isSite && shown?.status === 'resolved' && after.length === 0
  const rel = shown as unknown as {
    drawing?: { drawing_number: string | null } | null
    material?: { name: string } | null
    parent_id: string | null
    parent: { seq: number; type: string; title: string } | null
    tags: { id: string; name: string; color: string | null }[]
    allTags: { id: string; name: string; color: string | null }[]
    subtasks: { id: string; seq: number; type: string; title: string; status: string }[]
  }

  return (
    <Drawer label="Ticket detail" onClose={() => setSearchParams({ ticket: null })}>
      {!shown && (loading ? <DrawerSkeleton /> : <p className="text-sm text-ink-muted">Couldn&apos;t load this ticket.</p>)}
      {shown && (
        <div className="space-y-5">
          <div>
            <div className="font-mono text-xs text-ink-muted">
              {(shown.type === 'site_issue' ? 'SITE-' : 'TASK-') + shown.seq}
            </div>
            <h2 className="text-lg font-semibold">{shown.title}</h2>
            <div className="mt-1 flex gap-3 text-xs text-ink-muted">
              <span>{shown.discipline}</span>
              <span>{shown.priority}</span>
              {shown.due_date && <span>due {shown.due_date}</span>}
            </div>
            {shown.drawing_id && (
              <Link href={`/drawings/${shown.drawing_id}`} className="mt-1 inline-block text-xs text-primary hover:underline">
                {rel.drawing?.drawing_number ? `${rel.drawing.drawing_number} — linked drawing` : 'Linked drawing'} →
              </Link>
            )}
            {shown.material_id && (
              <Link href={`/materials/${shown.material_id}`} className="mt-1 block text-xs text-primary hover:underline">
                {rel.material?.name ? `${rel.material.name} — linked material` : 'Linked material'} →
              </Link>
            )}
          </div>
          {isSite && (
            <div className="space-y-3">
              <BeforeAfter
                before={before.map((p) => ({ url: p.url, markers: p.markers as Marker[] }))}
                after={after.map((p) => ({ url: p.url, markers: p.markers as Marker[] }))}
              />
              {needsAfterToVerify && (
                <p className="rounded border border-subtle bg-surface-hover px-2.5 py-1.5 text-xs text-ink-muted">
                  Add an after-photo to verify this issue.
                </p>
              )}
              <AddPhoto ticketId={shown.id} projectId={shown.project_id} kind="after" onSaved={reload} />
            </div>
          )}
          <StatusControl
            id={shown.id}
            type={shown.type as TicketType}
            status={shown.status as TicketStatus}
            onChanged={reload}
          />
          {shown.description && <p className="text-sm">{shown.description}</p>}
          <TicketExtras
            ticketId={shown.id}
            projectId={shown.project_id}
            discipline={shown.discipline}
            parentId={rel.parent_id}
            parent={rel.parent}
            tags={rel.tags}
            allTags={rel.allTags}
            subtasks={rel.subtasks}
            onChanged={reload}
            onOpenTicket={(tid) => setSearchParams({ ticket: tid })}
          />
          {!isSite &&
            shown.photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p.url} alt="" className="max-w-full rounded" />
            ))}
          <CommentThread ticketId={shown.id} comments={shown.comments} onPosted={reload} />
        </div>
      )}
    </Drawer>
  )
}
