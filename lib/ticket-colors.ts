// ponytail: plain lookup, no test — a static map can't drift silently.
import type { TicketStatus } from '@/lib/status'

export const STATUS_COLOR: Record<TicketStatus, string> = {
  open: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  resolved: 'bg-amber-500',
  verified: 'bg-violet-500',
  closed: 'bg-green-500',
}
