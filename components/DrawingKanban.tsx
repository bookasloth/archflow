'use client'
import { useOptimistic, useState, useTransition } from 'react'
import { REVISION_ORDER, formatRevision, type RevisionStatus } from '@/lib/revision-status'
import { revisionLabel, disciplineLabel, type Discipline } from '@/lib/labels'
import { setSearchParams } from '@/lib/url-state'
import { RevisionBadge } from '@/components/ui/Badge'
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

const DISCIPLINE_DOT: Record<string, string> = {
  architectural: 'bg-discipline-architectural',
  structural: 'bg-discipline-structural',
  electrical: 'bg-discipline-electrical',
  plumbing: 'bg-discipline-plumbing',
  fire_safety: 'bg-discipline-fire_safety',
  interior: 'bg-discipline-interior',
  landscape: 'bg-discipline-landscape',
  construction: 'bg-discipline-construction',
  documentation: 'bg-discipline-documentation',
  client_coordination: 'bg-discipline-client_coordination',
}

export function DrawingKanban({ drawings }: { drawings: KanbanDrawing[] }) {
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

  const openDrawer = (id: string) => setSearchParams({ drawing: id })
  const noRevision = optDrawings.filter((d) => !d.latestStatus)

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-faint" aria-live="polite">
        {error ? <span className="text-danger">{error}</span> : 'Drag a card to any column, or open it to change status.'}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {noRevision.length > 0 && (
          <Column label="No revision" count={noRevision.length} dotClass="bg-ink-faint" state="idle">
            {noRevision.map((d) => (
              <Card key={d.id} d={d} draggable={false} onOpen={() => openDrawer(d.id)} />
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
                  No drawings
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
                    onOpen={() => openDrawer(d.id)}
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
}: {
  d: KanbanDrawing
  draggable: boolean
  isDragging?: boolean
  onOpen: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        // Without setData, Firefox never starts an HTML5 drag.
        e.dataTransfer.setData('text/plain', d.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`space-y-1 rounded-lg border border-subtle bg-surface p-2 text-sm shadow-sm ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${isDragging ? 'opacity-50' : ''} hover:border-line`}
    >
      <div className="flex items-center gap-1.5">
        {d.drawing_number && <span className="font-mono text-xs text-ink-faint">{d.drawing_number}</span>}
        <span className="truncate text-ink">{d.title}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        {d.discipline && (
          <span className="inline-flex items-center gap-1">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${DISCIPLINE_DOT[d.discipline] ?? 'bg-ink-faint'}`} />
            {disciplineLabel(d.discipline as Discipline)}
          </span>
        )}
        {d.latestNo && <span>{formatRevision(d.latestNo)}</span>}
        {d.latestStatus && <RevisionBadge status={d.latestStatus} />}
      </div>
    </div>
  )
}
