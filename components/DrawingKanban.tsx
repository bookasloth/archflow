'use client'
import { useOptimistic, useState, useTransition } from 'react'
import { REVISION_ORDER, formatRevision, type RevisionStatus } from '@/lib/revision-status'
import { revisionLabel, type Discipline } from '@/lib/labels'
import { prefetchOnHover } from '@/lib/detail-store'
import { clickSuppressed, kanbanScrollerRef, touchDrag } from '@/lib/touch-drag'
import { openDrawing, drawingStore } from '@/components/DrawingDrawer'
import { RevisionBadge, DisciplineBadge } from '@/components/ui/Badge'
import { KanbanColumn as Column } from '@/components/ui/KanbanColumn'
import { setRevisionStatus } from '@/app/(app)/drawing-actions'

export type KanbanDrawing = {
  id: string
  drawing_number: string | null
  title: string
  discipline: string | null
  latestNo: number | null
  latestStatus: RevisionStatus | null
  latestRevId: string | null
  subtitle?: string | null // bottom line, like the assignee on ticket cards
}

const HEADER_DOT: Record<RevisionStatus, string> = {
  draft: 'bg-approval-draft-fg',
  under_review: 'bg-approval-under_review-fg',
  approved: 'bg-approval-approved-fg',
  approved_with_comments: 'bg-approval-approved_with_comments-fg',
  changes_requested: 'bg-approval-changes_requested-fg',
  rejected: 'bg-approval-rejected-fg',
  superseded: 'bg-approval-superseded-fg',
}


// mode="revisions": one card per revision of a single drawing (drawing page) — drag only,
// no drawer to open. Default: one card per drawing (register), click opens the drawer.
export function DrawingKanban({
  drawings,
  mode = 'drawings',
}: {
  drawings: KanbanDrawing[]
  mode?: 'drawings' | 'revisions'
}) {
  const open = mode === 'drawings' ? openDrawing : undefined
  const [, startTransition] = useTransition()
  const [optDrawings, applyMove] = useOptimistic(
    drawings,
    (state: KanbanDrawing[], move: { id: string; to: RevisionStatus }) =>
      state.map((d) => (d.id === move.id ? { ...d, latestStatus: move.to } : d)),
  )
  const [dragging, setDragging] = useState<KanbanDrawing | null>(null)
  const [error, setError] = useState<string | null>(null)

  // All states → all states: any column except the card's own is a drop target.
  function move(d: KanbanDrawing, to: RevisionStatus) {
    if (!d.latestRevId || d.latestStatus === to) return
    setError(null)
    startTransition(async () => {
      applyMove({ id: d.id, to })
      const fd = new FormData()
      fd.set('revision_id', d.latestRevId!)
      fd.set('to', to)
      // The action revalidates this register, so fresh props land in the same response.
      // On failure nothing revalidates and useOptimistic snaps the card back.
      const res = await setRevisionStatus(fd).catch(() => ({ ok: false, error: 'Move failed — check your connection' }))
      if (!res.ok) setError(res.error ?? 'Move failed')
    })
  }

  const noRevision = optDrawings.filter((d) => !d.latestStatus)

  return (
    <div className="space-y-3">
      {/* Same as the ticket board: only speaks up while dragging or on an error. */}
      <p className="min-h-4 text-xs" aria-live="polite">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : dragging ? (
          <span className="text-ink-faint">Drop on any stage</span>
        ) : null}
      </p>
      <div ref={kanbanScrollerRef} className="flex gap-3 overflow-x-auto pb-2">
        {noRevision.length > 0 && (
          <Column label="No revision" count={noRevision.length} dotClass="bg-ink-faint" state="idle">
            {noRevision.map((d) => (
              <Card key={d.id} d={d} draggable={false} onOpen={open && (() => open(d))} />
            ))}
          </Column>
        )}
        {REVISION_ORDER.map((status) => {
          const cards = optDrawings.filter((d) => d.latestStatus === status)
          const isTarget = dragging != null && dragging.latestStatus !== status
          return (
            <Column
              key={status}
              label={revisionLabel(status)}
              count={cards.length}
              dotClass={HEADER_DOT[status]}
              dropStatus={status}
              state={isTarget ? 'target' : 'idle'}
              onDragOver={(e) => {
                if (!isTarget) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging && isTarget) move(dragging, status)
                setDragging(null)
              }}
            >
              {cards.length === 0 ? (
                <div className="rounded border border-dashed border-subtle p-3 text-center text-xs text-ink-faint">
                  {mode === 'drawings' ? 'No drawings' : 'No revisions'}
                </div>
              ) : (
                cards.map((d) => (
                  <Card
                    key={d.id}
                    d={d}
                    draggable={!!d.latestRevId}
                    isDragging={dragging?.id === d.id}
                    onDragStart={() => setDragging(d)}
                    onDragEnd={() => setDragging(null)}
                    onOpen={open && (() => open(d))}
                    bind={touchDrag(d, {
                      onStart: setDragging,
                      onEnd: (card, to) => {
                        setDragging(null)
                        if (to) move(card, to as RevisionStatus)
                      },
                    })}
                  />
                ))
              )}
            </Column>
          )
        })}
      </div>
    </div>
  )
}

function Card({
  d,
  draggable,
  isDragging = false,
  onOpen,
  onDragStart,
  onDragEnd,
  bind,
}: {
  d: KanbanDrawing
  draggable: boolean
  isDragging?: boolean
  onOpen?: () => void // absent = drag-only card (revisions)
  onDragStart?: () => void
  onDragEnd?: () => void
  bind?: React.HTMLAttributes<HTMLDivElement> // touch-drag handlers
}) {
  return (
    <div
      {...(draggable ? bind : undefined)}
      {...(onOpen && prefetchOnHover(() => drawingStore.prefetch(d.id)))}
      draggable={draggable}
      onDragStart={(e) => {
        // Without setData, Firefox never starts an HTML5 drag.
        e.dataTransfer.setData('text/plain', d.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      onDragEnd={onDragEnd}
      {...(onOpen && {
        onClick: () => !clickSuppressed() && onOpen(),
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        },
      })}
      className={`select-none space-y-1 rounded-lg border [-webkit-touch-callout:none] border-subtle bg-surface p-2 text-sm shadow-sm ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${isDragging ? 'opacity-50' : ''} hover:border-line`}
    >
      {/* Same layout as TicketCard: code + badge, title, meta, person. */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-ink-muted">{d.drawing_number ?? '—'}</span>
        {d.latestStatus && <RevisionBadge status={d.latestStatus} />}
      </div>
      <div className="font-medium text-ink">{d.title}</div>
      {(d.discipline || d.latestNo) && (
        <div className="flex items-center justify-between text-xs text-ink-muted">
          {d.discipline ? <DisciplineBadge discipline={d.discipline as Discipline} /> : <span />}
          {d.latestNo && <span>{formatRevision(d.latestNo)}</span>}
        </div>
      )}
      {d.subtitle && <div className="text-xs text-ink-muted">{d.subtitle}</div>}
    </div>
  )
}
