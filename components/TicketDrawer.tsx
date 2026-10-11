'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { getTicketDetail } from '@/app/(app)/actions'
import { setSearchParams } from '@/lib/url-state'
import { detailStore, stableUrl } from '@/lib/detail-store'
import { Drawer, DrawerSkeleton } from '@/components/ui/Drawer'
import { StatusBadge } from '@/components/ui/Badge'
import { StatusControl } from '@/components/StatusControl'
import { BeforeAfter } from '@/components/BeforeAfter'
import { AddPhoto } from '@/components/AddPhoto'
import { CommentThread } from '@/components/CommentThread'
import { TicketExtras } from '@/components/TicketExtras'
import type { TicketType, TicketStatus } from '@/lib/status'
import type { Marker } from '@/components/PhotoMarker'

type Detail = NonNullable<Awaited<ReturnType<typeof getTicketDetail>>>

export const ticketStore = detailStore<Detail>((id) => `/api/tickets/${id}`)

// What a card/row already knows. The drawer paints it instantly while the rest loads.
export type TicketSeed = { id: string; seq: number; type: string; title: string; status?: string }
const seeds = new Map<string, TicketSeed>()
export function openTicket(seed: TicketSeed) {
  seeds.set(seed.id, seed)
  setSearchParams({ ticket: seed.id })
}

const code = (t: { type: string; seq: number }) => (t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq

export function TicketDrawer() {
  const id = useSearchParams().get('ticket')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    let alive = true
    const cached = ticketStore.cached(id)
    setDetail(cached ?? null)
    setLoading(true)
    // No cache: reuse a hover prefetch already in flight. Cached: show it, refresh behind it.
    ticketStore
      .load(id, !!cached)
      .then((d) => alive && setDetail(d))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  // Awaited by status/comment/photo/tag changes so optimistic UI hands off without a flicker.
  const refresh = useCallback(async () => {
    if (!id) return
    const d = await ticketStore.load(id, true).catch(() => null)
    if (d) setDetail(d)
  }, [id])

  if (!id) return null
  // Never flash the previous ticket while the next one loads.
  const shown = detail?.id === id ? detail : null
  const seed = seeds.get(id)

  const photos = (shown?.photos ?? []).map((p) => ({ ...p, url: stableUrl(p.path, p.url) }))
  const before = photos.filter((p) => p.kind === 'before')
  const after = photos.filter((p) => p.kind === 'after')
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
      {!shown && seed && (
        <div className="mb-5">
          <div className="font-mono text-xs text-ink-muted">{code(seed)}</div>
          <h2 className="text-lg font-semibold">{seed.title}</h2>
          {seed.status && <div className="mt-1"><StatusBadge status={seed.status as TicketStatus} /></div>}
        </div>
      )}
      {!shown &&
        (loading ? (
          <DrawerSkeleton withHeader={!seed} />
        ) : (
          <p className="text-sm text-ink-muted">Couldn&apos;t load this ticket.</p>
        ))}
      {shown && (
        <div className="space-y-5">
          <div>
            <div className="font-mono text-xs text-ink-muted">{code(shown)}</div>
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
              <AddPhoto ticketId={shown.id} projectId={shown.project_id} kind="after" onSaved={refresh} />
            </div>
          )}
          <StatusControl
            id={shown.id}
            type={shown.type as TicketType}
            status={shown.status as TicketStatus}
            onChanged={refresh}
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
            onChanged={refresh}
            onOpenTicket={(tid) => {
              const s = rel.subtasks.find((x) => x.id === tid)
              if (s) openTicket(s)
              else setSearchParams({ ticket: tid })
            }}
          />
          {!isSite &&
            photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p.url} alt="" loading="lazy" className="max-w-full rounded" />
            ))}
          <CommentThread ticketId={shown.id} comments={shown.comments} onPosted={refresh} />
        </div>
      )}
    </Drawer>
  )
}
