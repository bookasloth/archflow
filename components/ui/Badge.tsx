import type { ReactNode } from 'react'
import type { TicketStatus } from '@/lib/status'
import type { Priority } from '@/lib/health'
import type { RevisionStatus } from '@/lib/revision-status'
import { statusLabel, priorityLabel, disciplineLabel, revisionLabel, type Discipline } from '@/lib/labels'

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  )
}

// Full literal class strings so Tailwind's content scanner keeps them (never interpolate).
const STATUS_CLS: Record<TicketStatus, string> = {
  open: 'bg-status-open-soft text-status-open-fg',
  in_progress: 'bg-status-in_progress-soft text-status-in_progress-fg',
  resolved: 'bg-status-resolved-soft text-status-resolved-fg',
  verified: 'bg-status-verified-soft text-status-verified-fg',
  closed: 'bg-status-closed-soft text-status-closed-fg',
}
export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={STATUS_CLS[status]}>{statusLabel(status)}</Badge>
}

const PRIORITY_CLS: Record<Priority, string> = {
  low: 'bg-priority-low-soft text-priority-low-fg',
  medium: 'bg-priority-medium-soft text-priority-medium-fg',
  high: 'bg-priority-high-soft text-priority-high-fg',
  critical: 'bg-priority-critical-soft text-priority-critical-fg',
}
export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={PRIORITY_CLS[priority]}>{priorityLabel(priority)}</Badge>
}

const DISCIPLINE_DOT: Record<Discipline, string> = {
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
export function DisciplineBadge({ discipline }: { discipline: Discipline }) {
  return (
    <Badge className="bg-surface-hover text-ink-muted">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${DISCIPLINE_DOT[discipline]}`} />
      {disciplineLabel(discipline)}
    </Badge>
  )
}

const REVISION_CLS: Record<RevisionStatus, string> = {
  draft: 'bg-approval-draft-soft text-approval-draft-fg',
  under_review: 'bg-approval-under_review-soft text-approval-under_review-fg',
  approved: 'bg-approval-approved-soft text-approval-approved-fg',
  approved_with_comments: 'bg-approval-approved_with_comments-soft text-approval-approved_with_comments-fg',
  changes_requested: 'bg-approval-changes_requested-soft text-approval-changes_requested-fg',
  rejected: 'bg-approval-rejected-soft text-approval-rejected-fg',
  superseded: 'bg-approval-superseded-soft text-approval-superseded-fg',
}
export function RevisionBadge({ status }: { status: RevisionStatus }) {
  return <Badge className={REVISION_CLS[status]}>{revisionLabel(status)}</Badge>
}
