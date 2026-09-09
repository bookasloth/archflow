'use client'
import type { TicketStatus } from '@/lib/status'

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
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  ticket: CardTicket
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
      className="cursor-pointer space-y-1 rounded border bg-white p-2 text-sm shadow-sm hover:border-gray-400"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-gray-500">
          {(ticket.type === 'site_issue' ? 'SITE-' : 'TASK-') + ticket.seq}
        </span>
        <span className="text-xs text-gray-500">{ticket.priority}</span>
      </div>
      <div className="font-medium">{ticket.title}</div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{ticket.discipline}</span>
        {ticket.due_date && <span>due {ticket.due_date}</span>}
      </div>
      {ticket.assignee?.full_name && (
        <div className="text-xs text-gray-600">{ticket.assignee.full_name}</div>
      )}
    </div>
  )
}
