export type TicketType = 'task' | 'site_issue'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed'

const TASK: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['open', 'closed'],
  closed: ['open'],
  resolved: [],
  verified: [],
}

const SITE: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['verified', 'in_progress'],
  verified: ['closed', 'in_progress'],
  closed: [],
}

export function allowedTransitions(type: TicketType, status: TicketStatus): TicketStatus[] {
  return (type === 'task' ? TASK : SITE)[status]
}

export function canTransition(
  type: TicketType,
  from: TicketStatus,
  to: TicketStatus,
  ctx: { hasAfterPhoto: boolean },
): boolean {
  if (!allowedTransitions(type, from).includes(to)) return false
  if (to === 'verified' && !ctx.hasAfterPhoto) return false
  return true
}
