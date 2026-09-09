import type { TicketStatus } from '@/lib/status'
import type { Priority } from '@/lib/health'
import type { RevisionStatus } from '@/lib/revision-status'

export type Discipline =
  | 'architectural' | 'structural' | 'electrical' | 'plumbing' | 'fire_safety'
  | 'interior' | 'landscape' | 'construction' | 'documentation' | 'client_coordination'

const STATUS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  verified: 'Verified',
  closed: 'Closed',
}
const PRIORITY: Record<Priority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
}
const DISCIPLINE: Record<Discipline, string> = {
  architectural: 'Architectural', structural: 'Structural', electrical: 'Electrical',
  plumbing: 'Plumbing', fire_safety: 'Fire safety', interior: 'Interior',
  landscape: 'Landscape', construction: 'Construction', documentation: 'Documentation',
  client_coordination: 'Client coordination',
}
const REVISION: Record<RevisionStatus, string> = {
  draft: 'Draft', under_review: 'Under review', approved: 'Approved',
  approved_with_comments: 'Approved with comments', changes_requested: 'Changes requested',
  rejected: 'Rejected', superseded: 'Superseded',
}

export const statusLabel = (s: TicketStatus) => STATUS[s]
export const priorityLabel = (p: Priority) => PRIORITY[p]
export const disciplineLabel = (d: Discipline) => DISCIPLINE[d]
export const revisionLabel = (s: RevisionStatus) => REVISION[s]
