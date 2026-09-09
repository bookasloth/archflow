'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getTicketDetail } from '@/app/(app)/actions'
import { StatusControl } from '@/components/StatusControl'
import { BeforeAfter } from '@/components/BeforeAfter'
import { AddPhoto } from '@/components/AddPhoto'
import { CommentThread } from '@/components/CommentThread'
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
  }, [id])

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!id) return null

  const before = detail?.photos.filter((p) => p.kind === 'before') ?? []
  const after = detail?.photos.filter((p) => p.kind === 'after') ?? []

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={close} aria-hidden />
      <aside
        role="dialog"
        aria-label="Ticket detail"
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl"
      >
        <button onClick={close} className="mb-3 text-sm text-gray-500 hover:text-gray-900">
          ✕ Close
        </button>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && !detail && <p className="text-sm text-gray-500">Not found.</p>}
        {detail && (
          <div className="space-y-5">
            <div>
              <div className="font-mono text-xs text-gray-500">
                {(detail.type === 'site_issue' ? 'SITE-' : 'TASK-') + detail.seq}
              </div>
              <h2 className="text-lg font-semibold">{detail.title}</h2>
              <div className="mt-1 flex gap-3 text-xs text-gray-500">
                <span>{detail.discipline}</span>
                <span>{detail.priority}</span>
                {detail.due_date && <span>due {detail.due_date}</span>}
              </div>
            </div>
            {detail.description && <p className="text-sm">{detail.description}</p>}
            <StatusControl
              id={detail.id}
              type={detail.type as TicketType}
              status={detail.status as TicketStatus}
            />
            {detail.type === 'site_issue' ? (
              <div className="space-y-3">
                <BeforeAfter
                  before={before.map((p) => ({ url: p.url, markers: p.markers as Marker[] }))}
                  after={after.map((p) => ({ url: p.url, markers: p.markers as Marker[] }))}
                />
                <AddPhoto ticketId={detail.id} projectId={detail.project_id} kind="after" />
              </div>
            ) : (
              detail.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p.url} alt="" className="max-w-full rounded" />
              ))
            )}
            <CommentThread ticketId={detail.id} comments={detail.comments} />
          </div>
        )}
      </aside>
    </div>
  )
}
