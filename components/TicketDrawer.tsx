'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getTicketDetail } from '@/app/(app)/actions'
import { StatusControl } from '@/components/StatusControl'
import { BeforeAfter } from '@/components/BeforeAfter'
import { AddPhoto } from '@/components/AddPhoto'
import { CommentThread } from '@/components/CommentThread'
import { TicketExtras } from '@/components/TicketExtras'
import type { TicketType, TicketStatus } from '@/lib/status'
import type { Marker } from '@/components/PhotoMarker'

type Detail = Awaited<ReturnType<typeof getTicketDetail>>

export function TicketDrawer() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const id = params.get('ticket')
  const [detail, setDetail] = useState<Detail>(null)
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  function close() {
    const p = new URLSearchParams(params.toString())
    p.delete('ticket')
    router.replace(`${pathname}?${p.toString()}`)
  }

  useEffect(() => {
    if (!id) {
      setDetail(null)
      return
    }
    let alive = true
    setLoading(true)
    getTicketDetail(id).then((d) => {
      if (alive) {
        setDetail(d)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [id, reloadKey])

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (id) closeBtnRef.current?.focus()
  }, [id])

  if (!id) return null

  const before = detail?.photos.filter((p) => p.kind === 'before') ?? []
  const after = detail?.photos.filter((p) => p.kind === 'after') ?? []
  const isSite = detail?.type === 'site_issue'
  const needsAfterToVerify = isSite && detail?.status === 'resolved' && after.length === 0

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={close} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Ticket detail"
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-surface p-5 shadow-xl"
      >
        <button
          ref={closeBtnRef}
          onClick={close}
          className="mb-3 text-sm text-ink-muted hover:text-ink"
        >
          ✕ Close
        </button>
        {loading && <p className="text-sm text-ink-muted">Loading…</p>}
        {!loading && !detail && <p className="text-sm text-ink-muted">Not found.</p>}
        {detail && (
          <div className="space-y-5">
            <div>
              <div className="font-mono text-xs text-ink-muted">
                {(detail.type === 'site_issue' ? 'SITE-' : 'TASK-') + detail.seq}
              </div>
              <h2 className="text-lg font-semibold">{detail.title}</h2>
              <div className="mt-1 flex gap-3 text-xs text-ink-muted">
                <span>{detail.discipline}</span>
                <span>{detail.priority}</span>
                {detail.due_date && <span>due {detail.due_date}</span>}
              </div>
              {detail.drawing_id && (
                <a
                  href={`/drawings/${detail.drawing_id}`}
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  {(detail as unknown as { drawing?: { drawing_number: string | null; title: string } | null }).drawing?.drawing_number
                    ? `${(detail as unknown as { drawing?: { drawing_number: string | null } | null }).drawing!.drawing_number} — linked drawing`
                    : 'Linked drawing'} →
                </a>
              )}
              {detail.material_id && (
                <a
                  href={`/materials/${detail.material_id}`}
                  className="mt-1 block text-xs text-primary hover:underline"
                >
                  {(detail as unknown as { material?: { name: string } | null }).material?.name
                    ? `${(detail as unknown as { material?: { name: string } | null }).material!.name} — linked material`
                    : 'Linked material'} →
                </a>
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
                <AddPhoto ticketId={detail.id} projectId={detail.project_id} kind="after" />
              </div>
            )}
            <StatusControl
              id={detail.id}
              type={detail.type as TicketType}
              status={detail.status as TicketStatus}
              onChanged={() => setReloadKey((k) => k + 1)}
            />
            {detail.description && <p className="text-sm">{detail.description}</p>}
            <TicketExtras
              ticketId={detail.id}
              projectId={detail.project_id}
              discipline={detail.discipline}
              parentId={(detail as unknown as { parent_id: string | null }).parent_id}
              parent={(detail as unknown as { parent: { seq: number; type: string; title: string } | null }).parent}
              tags={(detail as unknown as { tags: { id: string; name: string; color: string | null }[] }).tags}
              allTags={(detail as unknown as { allTags: { id: string; name: string; color: string | null }[] }).allTags}
              subtasks={(detail as unknown as { subtasks: { id: string; seq: number; type: string; title: string; status: string }[] }).subtasks}
              onChanged={() => setReloadKey((k) => k + 1)}
              onOpenTicket={(tid) => {
                const p = new URLSearchParams(params.toString())
                p.set('ticket', tid)
                router.replace(`${pathname}?${p.toString()}`)
              }}
            />
            {!isSite &&
              detail.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p.url} alt="" className="max-w-full rounded" />
              ))}
            <CommentThread ticketId={detail.id} comments={detail.comments} />
          </div>
        )}
      </aside>
    </div>
  )
}
