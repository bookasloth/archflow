'use client'
import { useOptimistic, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { allowedTransitions, type TicketStatus, type TicketType } from '@/lib/status'
import { columnsFor } from '@/lib/kanban-columns'
import { STATUS_COLOR } from '@/lib/ticket-colors'
import { statusLabel } from '@/lib/labels'
import { setSearchParams } from '@/lib/url-state'
import { TicketCard, type CardTicket } from '@/components/TicketCard'
import { KanbanColumn } from '@/components/ui/KanbanColumn'
import { changeStatus } from '@/app/(app)/actions'

const TYPES: { key: TicketType; label: string }[] = [
  { key: 'task', label: 'Task' },
  { key: 'site_issue', label: 'Site' },
]

export function KanbanBoard({ tickets }: { tickets: CardTicket[] }) {
  const params = useSearchParams()
  const activeType: TicketType = params.get('ktype') === 'site_issue' ? 'site_issue' : 'task'

  const [, startTransition] = useTransition()
  const [optTickets, applyMove] = useOptimistic(
    tickets,
    (state: CardTicket[], move: { id: string; to: TicketStatus }) =>
      state.map((t) => (t.id === move.id ? { ...t, status: move.to } : t)),
  )
  const [dragging, setDragging] = useState<CardTicket | null>(null)
  const [error, setError] = useState<string | null>(null)

  const columns = columnsFor(activeType)
  const shown = optTickets.filter((t) => t.type === activeType)
  // Ticket moves follow the workflow (site issues are evidence-gated), so only legal
  // columns light up; the rest dim while dragging instead of silently refusing the drop.
  const legalTargets = dragging ? allowedTransitions(dragging.type, dragging.status) : []

  function move(ticket: CardTicket, to: TicketStatus) {
    if (ticket.status === to) return
    if (!allowedTransitions(ticket.type, ticket.status).includes(to)) return
    setError(null)
    startTransition(async () => {
      applyMove({ id: ticket.id, to })
      const fd = new FormData()
      fd.set('ticket_id', ticket.id)
      fd.set('to', to)
      const res = await changeStatus(fd).catch(() => ({ ok: false, error: 'Move failed — check your connection' }))
      // On success the action revalidates and fresh props reconcile the state.
      // On failure no revalidation happens, so useOptimistic auto-reverts.
      if (!res.ok) setError(res.error ?? 'Move failed')
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded border text-sm">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSearchParams({ ktype: t.key === 'task' ? null : t.key })}
              aria-pressed={activeType === t.key}
              className={`px-3 py-1 first:rounded-l last:rounded-r ${
                activeType === t.key ? 'bg-primary-soft text-primary font-medium' : 'text-ink-muted hover:bg-surface-hover'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-xs" aria-live="polite">
          {error ? (
            <span className="text-danger">{error}</span>
          ) : dragging ? (
            <span className="text-ink-faint">
              {legalTargets.length
                ? `Can move to: ${legalTargets.map(statusLabel).join(', ')}`
                : 'This card has no next step'}
            </span>
          ) : null}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((status) => {
          const cards = shown.filter((t) => t.status === status)
          const isTarget = dragging != null && legalTargets.includes(status)
          const isBlocked = dragging != null && !isTarget && dragging.status !== status
          return (
            <KanbanColumn
              key={status}
              label={statusLabel(status)}
              count={cards.length}
              dotClass={STATUS_COLOR[status]}
              state={isTarget ? 'target' : isBlocked ? 'blocked' : 'idle'}
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
                  No tickets
                </div>
              ) : (
                cards.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    isDragging={dragging?.id === t.id}
                    onOpen={(id) => setSearchParams({ ticket: id })}
                    onDragStart={setDragging}
                    onDragEnd={() => setDragging(null)}
                  />
                ))
              )}
            </KanbanColumn>
          )
        })}
      </div>
    </div>
  )
}
