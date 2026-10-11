'use client'
import { useCallback, useEffect, useOptimistic, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { setRevisionStatus, type getRevisionDetail } from '@/app/(app)/drawing-actions'
import { setSearchParams } from '@/lib/url-state'
import { detailStore, stableUrl } from '@/lib/detail-store'
import { ageLabel, daysSince, isStale } from '@/lib/age'
import { REVISION_ORDER, formatRevision, isApproved, type RevisionStatus } from '@/lib/revision-status'
import { revisionLabel } from '@/lib/labels'
import { Drawer, DrawerSkeleton } from '@/components/ui/Drawer'
import { AgeBadge, RevisionBadge, StatusBadge } from '@/components/ui/Badge'
import { openTicket } from '@/components/TicketDrawer'
import type { TicketStatus } from '@/lib/status'

type Detail = NonNullable<Awaited<ReturnType<typeof getRevisionDetail>>>

export const revisionStore = detailStore<Detail>((id) => `/api/revisions/${id}`)

// What the card already knows. The drawer paints it instantly while the rest loads.
export type RevisionSeed = { id: string; code: string | null; title: string; status: RevisionStatus | null }
const seeds = new Map<string, RevisionSeed>()
export function openRevision(seed: RevisionSeed) {
  seeds.set(seed.id, seed)
  setSearchParams({ revision: seed.id })
}

const IMG = ['png', 'jpg', 'jpeg', 'webp', 'gif']
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export function RevisionDrawer() {
  const id = useSearchParams().get('revision')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    const cached = revisionStore.cached(id)
    setDetail(cached ?? null)
    setError(null)
    setLoading(true)
    revisionStore
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
    const d = await revisionStore.load(id, true).catch(() => null)
    if (d) setDetail(d)
  }, [id])

  const shown = detail?.id === id ? detail : null
  const [status, setOptimisticStatus] = useOptimistic(shown?.status ?? null)

  if (!id) return null
  const seed = seeds.get(id)

  function setStatus(to: RevisionStatus) {
    if (!shown || shown.status === to) return
    setError(null)
    startTransition(async () => {
      setOptimisticStatus(to)
      const fd = new FormData()
      fd.set('revision_id', shown.id)
      fd.set('to', to)
      const res = await setRevisionStatus(fd).catch(() => ({ ok: false, error: 'Could not change status — check your connection' }))
      if (!res.ok) setError(res.error ?? 'Could not change status')
      await refresh()
    })
  }

  const ext = (shown?.path.split('.').pop() || '').toLowerCase()
  const url = shown ? stableUrl(shown.path, shown.url) : ''
  const since = shown ? (shown.decided_at ?? shown.created_at) : null
  const days = since ? daysSince(since) : 0

  return (
    <Drawer label="Revision detail" onClose={() => setSearchParams({ revision: null })}>
      {!shown && seed && (
        <div className="mb-5">
          <div className="font-mono text-xs text-ink-muted">{seed.code}</div>
          <h2 className="text-lg font-semibold">{seed.title}</h2>
          {seed.status && <div className="mt-1"><RevisionBadge status={seed.status} /></div>}
        </div>
      )}
      {!shown &&
        (loading ? (
          <DrawerSkeleton withHeader={!seed} />
        ) : (
          <p className="text-sm text-ink-muted">Couldn&apos;t load this revision.</p>
        ))}
      {shown && (
        <div className="space-y-5">
          <div>
            <div className="font-mono text-xs text-ink-muted">
              {formatRevision(shown.revision_no)}
              {shown.drawing && ` · ${shown.drawing.drawing_number ?? shown.drawing.title}`}
            </div>
            <h2 className="text-lg font-semibold">{shown.notes || `Uploaded ${fmt(shown.created_at)}`}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {status && <RevisionBadge status={status} />}
              <AgeBadge label={ageLabel(days)} stale={isStale(status, days)} />
            </div>
          </div>

          <section className="space-y-1">
            <label htmlFor="revision-status" className="text-sm font-medium text-ink">Status</label>
            <select
              id="revision-status"
              value={status ?? ''}
              disabled={pending}
              onChange={(e) => setStatus(e.target.value as RevisionStatus)}
              className="block w-full rounded border border-subtle bg-surface px-2 py-1.5 text-sm text-ink disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            >
              {REVISION_ORDER.map((s) => (
                <option key={s} value={s}>{revisionLabel(s)}</option>
              ))}
            </select>
            {status && isApproved(status) && (
              <p className="text-xs text-ink-faint">Approving supersedes the drawing&apos;s other approved revisions.</p>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
          </section>

          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-ink-muted">Uploaded</dt>
            <dd className="text-ink">{shown.uploader ?? 'someone'} · {fmt(shown.created_at)}</dd>
            {shown.decided_at && (
              <>
                <dt className="text-ink-muted">Decided</dt>
                <dd className="text-ink">{shown.reviewer ? `${shown.reviewer} · ` : ''}{fmt(shown.decided_at)}</dd>
              </>
            )}
            {shown.notes && (
              <>
                <dt className="text-ink-muted">Notes</dt>
                <dd className="whitespace-pre-wrap text-ink">{shown.notes}</dd>
              </>
            )}
          </dl>

          {url && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-ink">File</h3>
              {IMG.includes(ext) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" loading="lazy" className="max-w-full rounded border border-subtle" />
              )}
              <a href={url} target="_blank" rel="noreferrer" className="inline-block text-xs text-primary hover:underline">
                Open {ext ? ext.toUpperCase() : 'file'} ↗
              </a>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-medium text-ink">Issues on this revision · {shown.linkedTickets.length}</h3>
            {shown.linkedTickets.length === 0 ? (
              <p className="text-sm text-ink-faint">None.</p>
            ) : (
              <ul className="divide-y divide-subtle rounded border border-subtle">
                {shown.linkedTickets.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        setSearchParams({ revision: null })
                        openTicket(t)
                      }}
                      className="flex w-full items-center gap-2 p-2 text-left text-sm hover:bg-surface-hover"
                    >
                      <span className="font-mono text-xs text-ink-faint">
                        {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
                      <StatusBadge status={t.status as TicketStatus} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  )
}
