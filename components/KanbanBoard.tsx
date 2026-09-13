'use client'
import { useOptimistic, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { allowedTransitions, type TicketStatus, type TicketType } from '@/lib/status'
import { columnsFor } from '@/lib/kanban-columns'
import { STATUS_COLOR } from '@/lib/ticket-colors'
import { TicketCard, type CardTicket } from '@/components/TicketCard'
import { changeStatus } from '@/app/(app)/actions'

const TYPES: { key: TicketType; label: string }[] = [
  { key: 'task', label: 'Task' },
  { key: 'site_issue', label: 'Site' },
]

export function KanbanBoard({ tickets }: { tickets: CardTicket[] }) {
  const router = useRouter()
  const pathname = usePathname()
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
  const legalTargets = dragging
    ? allowedTransitions(dragging.type, dragging.status)
    : []

  function setParam(key: string, value: string | null) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.replace(`${pathname}?${p.toString()}`)
  }

  function move(ticket: CardTicket, to: TicketStatus) {
    if (ticket.status === to) return
    if (!allowedTransitions(ticket.type, ticket.status).includes(to)) return
    setError(null)
    startTransition(async () => {
      applyMove({ id: ticket.id, to })
      const fd = new FormData()
      fd.set('ticket_id', ticket.id)
      fd.set('to', to)
      const res = await changeStatus(fd)
      // On success the action revalidates and fresh props reconcile the state.
      // On failure no revalidation happens, so useOptimistic auto-reverts.
      if (!res.ok) setError(res.error ?? 'Move failed')
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded border text-sm">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setParam('ktype', t.key === 'task' ? null : t.key)}
              aria-pressed={activeType === t.key}
              className={`px-3 py-1 first:rounded-l last:rounded-r ${
                activeType === t.key ? 'bg-primary-soft text-primary font-medium' : 'text-ink-muted hover:bg-surface-hover'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((status) => {
          const cards = shown.filter((t) => t.status === status)
          const isTarget = dragging != null && legalTargets.includes(status)
          return (
            <div
              key={status}
              onDragOver={(e) => {
                if (isTarget) e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging && isTarget) move(dragging, status)
                setDragging(null)
              }}
              className={`flex min-h-[8rem] w-64 shrink-0 flex-col gap-2 rounded-lg border p-2 ${
                isTarget ? 'border-primary bg-primary-soft' : 'border-subtle bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLOR[status]}`} />
                <span className="capitalize">{status.replace('_', ' ')}</span>
                <span className="text-ink-faint">· {cards.length}</span>
              </div>
              {cards.length === 0 ? (
                <div className="rounded border border-dashed border-subtle p-3 text-center text-xs text-ink-faint">
                  No tickets
                </div>
              ) : (
                cards.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onOpen={(id) => setParam('ticket', id)}
                    onDragStart={setDragging}
                    onDragEnd={() => setDragging(null)}
                  />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
