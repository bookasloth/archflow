'use client'
import { useOptimistic, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  allowedRevisionTransitions,
  formatRevision,
  type RevisionStatus,
} from '@/lib/revision-status'
import { revisionLabel, disciplineLabel, type Discipline } from '@/lib/labels'
import { RevisionBadge } from '@/components/ui/Badge'
import { reviewRevision } from '@/app/(app)/drawing-actions'

export type KanbanDrawing = {
  id: string
  drawing_number: string | null
  title: string
  discipline: string | null
  latestNo: number | null
  latestStatus: RevisionStatus | null
  latestRevId: string | null
}

// Workflow order for columns. A leading "none" bucket holds drawings with no revision yet.
const COLUMNS: RevisionStatus[] = [
  'draft',
  'under_review',
  'changes_requested',
  'approved',
  'approved_with_comments',
  'rejected',
  'superseded',
]

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
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  // Open the drawing in the side drawer (mounted on the page), like the ticket drawer.
  function openDrawer(id: string) {
    const p = new URLSearchParams(params.toString())
    p.set('drawing', id)
    router.replace(`${pathname}?${p.toString()}`)
  }
  const [optDrawings, applyMove] = useOptimistic(
    drawings,
    (state: KanbanDrawing[], move: { id: string; to: RevisionStatus }) =>
      state.map((d) => (d.id === move.id ? { ...d, latestStatus: move.to } : d)),
  )
  const [dragging, setDragging] = useState<KanbanDrawing | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Kanban drag only handles progress moves (submit/resubmit -> under_review).
  // Decisions (approve / approve-with-comments / changes-requested / reject) stay
  // comment-required on the drawing detail page, so they're excluded as drop targets.
  const DECISIONS = new Set<RevisionStatus>([
    'approved',
    'approved_with_comments',
    'changes_requested',
    'rejected',
  ])
  const legalTargets =
    dragging && dragging.latestStatus
      ? allowedRevisionTransitions(dragging.latestStatus).filter((s) => !DECISIONS.has(s))
      : []

  function move(d: KanbanDrawing, to: RevisionStatus) {
    if (!d.latestStatus || !d.latestRevId) return
    if (d.latestStatus === to) return
    if (!allowedRevisionTransitions(d.latestStatus).includes(to)) return
    setError(null)
    startTransition(async () => {
      applyMove({ id: d.id, to })
      const fd = new FormData()
      fd.set('revision_id', d.latestRevId!)
      fd.set('to', to)
      try {
        await reviewRevision(fd)
        // reviewRevision revalidates the drawing detail path, not this register —
        // refresh so the board reconciles with server state (incl. auto-supersede).
        router.refresh()
      } catch {
        setError('Move failed')
      }
    })
  }

  const noRevision = optDrawings.filter((d) => !d.latestStatus)

  return (
    <div className="space-y-3">
      {error && <span className="text-xs text-priority-critical-fg">{error}</span>}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {noRevision.length > 0 && (
          <Column label="No revision" count={noRevision.length} dotClass="bg-ink-faint" isTarget={false}>
            {noRevision.map((d) => (
              <Card key={d.id} d={d} draggable={false} onOpen={() => openDrawer(d.id)} />
            ))}
          </Column>
        )}
        {COLUMNS.map((status) => {
          const cards = optDrawings.filter((d) => d.latestStatus === status)
          const isTarget = dragging != null && legalTargets.includes(status)
          return (
            <Column
              key={status}
              label={revisionLabel(status)}
              count={cards.length}
              dotClass={HEADER_DOT[status]}
              isTarget={isTarget}
              onDragOver={(e) => {
                if (isTarget) e.preventDefault()
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
                cards.map((d) => {
                  const canDrag =
                    !!d.latestRevId &&
                    allowedRevisionTransitions(status).some((s) => !DECISIONS.has(s))
                  return (
                    <Card
                      key={d.id}
                      d={d}
                      draggable={canDrag}
                      onDragStart={() => setDragging(d)}
                      onDragEnd={() => setDragging(null)}
                      onOpen={() => openDrawer(d.id)}
                    />
                  )
                })
              )}
            </Column>
          )
        })}
      </div>
    </div>
  )
}

function Column({
  label,
  count,
  dotClass,
  isTarget,
  onDragOver,
  onDrop,
  children,
}: {
  label: string
  count: number
  dotClass: string
  isTarget: boolean
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  children: React.ReactNode
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex min-h-[8rem] w-64 shrink-0 flex-col gap-2 rounded-lg border p-2 ${
        isTarget ? 'border-primary bg-primary-soft' : 'border-subtle bg-surface-hover'
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
        <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
        <span>{label}</span>
        <span className="text-ink-faint">· {count}</span>
      </div>
      {children}
    </div>
  )
}

function Card({
  d,
  draggable,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  d: KanbanDrawing
  draggable: boolean
  onOpen: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
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
      } hover:border-line`}
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
