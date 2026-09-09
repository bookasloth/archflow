import { allowedTransitions, type TicketType, type TicketStatus } from '@/lib/status'

export const STATUS_ORDER: TicketStatus[] = [
  'open', 'in_progress', 'resolved', 'verified', 'closed',
]

// Derive which statuses a type actually uses from its transition graph:
// a status is "used" if it has outgoing transitions or is a transition target.
export function columnsFor(type: TicketType): TicketStatus[] {
  const used = new Set<TicketStatus>()
  for (const s of STATUS_ORDER) {
    const next = allowedTransitions(type, s)
    if (next.length > 0) used.add(s)
    for (const t of next) used.add(t)
  }
  return STATUS_ORDER.filter((s) => used.has(s))
}
