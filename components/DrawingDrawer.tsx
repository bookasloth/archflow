'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getDrawingDetail } from '@/app/(app)/drawing-actions'
import { RevisionHistory } from '@/components/RevisionHistory'
import { RevisionBadge, DisciplineBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatRevision } from '@/lib/revision-status'
import type { Discipline } from '@/lib/labels'

type Detail = Awaited<ReturnType<typeof getDrawingDetail>>

export function DrawingDrawer() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const id = params.get('drawing')
  const [detail, setDetail] = useState<Detail>(null)
  const [loading, setLoading] = useState(false)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  function close() {
    const p = new URLSearchParams(params.toString())
    p.delete('drawing')
    router.replace(`${pathname}?${p.toString()}`)
  }

  useEffect(() => {
    if (!id) {
      setDetail(null)
      return
    }
    let alive = true
    setLoading(true)
    setDetail(null)
    getDrawingDetail(id).then((d) => {
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

  useEffect(() => {
    if (id) closeBtnRef.current?.focus()
  }, [id])

  if (!id) return null

  const latest = detail?.revisions[0]

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={close} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Drawing detail"
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-surface p-5 shadow-xl"
      >
        <button ref={closeBtnRef} onClick={close} className="mb-3 text-sm text-ink-muted hover:text-ink">
          ✕ Close
        </button>

        {/* Skeleton shows instantly on open so the panel never feels stuck. */}
        {loading && <DrawerSkeleton />}

        {!loading && !detail && <p className="text-sm text-ink-muted">Not found.</p>}

        {!loading && detail && (
          <div className="space-y-5">
            <div>
              {detail.drawing_number && (
                <div className="font-mono text-xs text-ink-muted">{detail.drawing_number}</div>
              )}
              <h2 className="text-lg font-semibold">{detail.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                {detail.discipline && <DisciplineBadge discipline={detail.discipline as Discipline} />}
                {latest && <RevisionBadge status={latest.status} />}
                {latest && <span className="text-ink-faint">Current {formatRevision(latest.revision_no)}</span>}
              </div>
              <a
                href={`/drawings/${detail.id}`}
                className="mt-2 inline-block text-xs text-primary hover:underline"
              >
                Open full drawing →
              </a>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-ink">Revisions</h3>
              <RevisionHistory revisions={detail.revisions} />
            </section>

            {detail.linkedTickets.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium text-ink">Linked issues</h3>
                <ul className="divide-y divide-subtle rounded border border-subtle">
                  {detail.linkedTickets.map((t) => (
                    <li key={t.id} className="p-2 text-sm">
                      <a href={`/tickets/${t.id}`} className="flex items-center gap-2 hover:underline">
                        <span className="font-mono text-xs text-ink-faint">
                          {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
                        </span>
                        <span className="truncate">{t.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}

function DrawerSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading drawing">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="divide-y divide-subtle rounded border border-subtle">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
