import type { TicketType, TicketStatus } from '@/lib/status'

export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type Health = 'green' | 'yellow' | 'red'

export interface HealthTicket {
  type: TicketType
  status: TicketStatus
  priority: Priority
  due_date: string | null
}

const DONE: TicketStatus[] = ['closed', 'verified']

function daysBetween(a: Date, b: Date): number {
  const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)
  return Math.round(ms / 86_400_000)
}

export function computeHealth(tickets: HealthTicket[], today: Date): Health {
  let red = false
  let yellow = false
  for (const t of tickets) {
    const done = DONE.includes(t.status)
    if (t.priority === 'critical' && !done && t.status !== 'resolved') red = true
    if (t.due_date && !done) {
      const d = daysBetween(today, new Date(t.due_date))
      if (d < 0) red = true
      else if (d <= 3) yellow = true
    }
    if (t.type === 'site_issue' && (t.status === 'open' || t.status === 'in_progress')) yellow = true
  }
  if (red) return 'red'
  if (yellow) return 'yellow'
  return 'green'
}
