'use client'
import { useCallback, useEffect, useOptimistic, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { setRevisionStatus, type getDrawingDetail } from '@/app/(app)/drawing-actions'
import { setSearchParams } from '@/lib/url-state'
import { detailStore } from '@/lib/detail-store'
import { Drawer, DrawerSkeleton } from '@/components/ui/Drawer'
import { RevisionHistory } from '@/components/RevisionHistory'
import { RevisionBadge, DisciplineBadge } from '@/components/ui/Badge'
import { REVISION_ORDER, formatRevision, type RevisionStatus } from '@/lib/revision-status'
import { revisionLabel, type Discipline } from '@/lib/labels'

type Detail = NonNullable<Awaited<ReturnType<typeof getDrawingDetail>>>

export const drawingStore = detailStore<Detail>((id) => `/api/drawings/${id}`)

// What the card already knows. The drawer paints it instantly while the rest loads.
export type DrawingSeed = { id: string; title: string; drawing_number: string | null; latestStatus: RevisionStatus | null }
const seeds = new Map<string, DrawingSeed>()
export function openDrawing(seed: DrawingSeed) {
  seeds.set(seed.id, seed)
  setSearchParams({ drawing: seed.id })
}

export function DrawingDrawer() {
  const id = useSearchParams().get('drawing')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    const cached = drawingStore.cached(id)
    setDetail(cached ?? null)
    setError(null)
    setLoading(true)
    // No cache: reuse a hover prefetch already in flight. Cached: show it, refresh behind it.
    drawingStore
      .load(id, !!cached)
      .then((d) => alive && setDetail(d))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  const refresh = useCallback(async () => {
    if (!id) return
    const d = await drawingStore.load(id, true).catch(() => null)
    if (d) setDetail(d)
  }, [id])

  const shown = detail?.id === id ? detail : null
  const latest = shown?.revisions[0]
  // The picker shows the new status immediately; a failed save snaps it back.
  const [status, setOptimisticStatus] = useOptimistic(latest?.status ?? null)

  if (!id) return null
  const seed = seeds.get(id)

  // Same all-to-all move as the board — the touch-friendly path.
  function setStatus(to: RevisionStatus) {
    if (!latest || latest.status === to) return
    setError(null)
    startTransition(async () => {
      setOptimisticStatus(to)
      const fd = new FormData()
      fd.set('revision_id', latest.id)
      fd.set('to', to)
      const res = await setRevisionStatus(fd).catch(() => ({ ok: false, error: 'Could not change status — check your connection' }))
      if (!res.ok) setError(res.error ?? 'Could not change status')
      await refresh()
    })
  }

  return (
    <Drawer label="Drawing detail" onClose={() => setSearchParams({ drawing: null })}>
      {!shown && seed && (
        <div className="mb-5">
          {seed.drawing_number && <div className="font-mono text-xs text-ink-muted">{seed.drawing_number}</div>}
          <h2 className="text-lg font-semibold">{seed.title}</h2>
          {seed.latestStatus && <div className="mt-1"><RevisionBadge status={seed.latestStatus} /></div>}
        </div>
      )}
      {!shown &&
        (loading ? (
          <DrawerSkeleton withHeader={!seed} />
        ) : (
          <p className="text-sm text-ink-muted">Couldn&apos;t load this drawing.</p>
        ))}
      {shown && (
        <div className="space-y-5">
          <div>
            {shown.drawing_number && <div className="font-mono text-xs text-ink-muted">{shown.drawing_number}</div>}
            <h2 className="text-lg font-semibold">{shown.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              {shown.discipline && <DisciplineBadge discipline={shown.discipline as Discipline} />}
              {status && <RevisionBadge status={status} />}
              {latest && <span className="text-ink-faint">Current {formatRevision(latest.revision_no)}</span>}
            </div>
            <Link href={`/drawings/${shown.id}`} className="mt-2 inline-block text-xs text-primary hover:underline">
              Open full drawing →
            </Link>
          </div>

          {latest && status && (
            <section className="space-y-1">
              <label htmlFor="drawing-status" className="text-sm font-medium text-ink">
                Status of {formatRevision(latest.revision_no)}
              </label>
              <select
                id="drawing-status"
                value={status}
                disabled={pending}
                onChange={(e) => setStatus(e.target.value as RevisionStatus)}
                className="block w-full rounded border border-subtle bg-surface px-2 py-1.5 text-sm text-ink disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              >
                {REVISION_ORDER.map((s) => (
                  <option key={s} value={s}>{revisionLabel(s)}</option>
                ))}
              </select>
              {error && <p className="text-xs text-danger">{error}</p>}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-medium text-ink">Revisions</h3>
            <RevisionHistory revisions={shown.revisions} readOnly />
          </section>

          {shown.linkedTickets.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-ink">Linked issues</h3>
              <ul className="divide-y divide-subtle rounded border border-subtle">
                {shown.linkedTickets.map((t) => (
                  <li key={t.id} className="p-2 text-sm">
                    <Link href={`/tickets/${t.id}`} className="flex items-center gap-2 hover:underline">
                      <span className="font-mono text-xs text-ink-faint">
                        {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
                      </span>
                      <span className="truncate">{t.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Drawer>
  )
}
