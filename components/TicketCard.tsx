'use client'
import type { TicketStatus } from '@/lib/status'
import { PriorityBadge, DisciplineBadge } from '@/components/ui/Badge'
import type { Priority } from '@/lib/health'
import type { Discipline } from '@/lib/labels'

export type CardTicket = {
  id: string
  seq: number
  type: 'task' | 'site_issue'
  discipline: string
  title: string
  status: TicketStatus
  priority: string
  due_date: string | null
  assignee: { full_name: string | null } | null
}

export function TicketCard({
  ticket,
  isDragging = false,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  ticket: CardTicket
  isDragging?: boolean
  onOpen: (id: string) => void
  onDragStart: (t: CardTicket) => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', ticket.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(ticket)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(ticket.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(ticket.id)
        }
      }}
      role="button"
      tabIndex={0}
      className={`cursor-grab space-y-1 rounded-lg border border-subtle bg-surface p-2 text-sm shadow-sm hover:border-line active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-ink-muted">
          {(ticket.type === 'site_issue' ? 'SITE-' : 'TASK-') + ticket.seq}
        </span>
        <PriorityBadge priority={ticket.priority as Priority} />
      </div>
      <div className="font-medium">{ticket.title}</div>
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <DisciplineBadge discipline={ticket.discipline as Discipline} />
        {ticket.due_date && <span>due {ticket.due_date}</span>}
      </div>
      {ticket.assignee?.full_name && (
        <div className="text-xs text-ink-muted">{ticket.assignee.full_name}</div>
      )}
    </div>
  )
}
