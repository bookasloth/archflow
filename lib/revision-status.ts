export type RevisionStatus =
  | 'draft' | 'under_review' | 'approved' | 'approved_with_comments'
  | 'changes_requested' | 'rejected' | 'superseded'

// Workflow order — Kanban columns and the drawer's status picker.
export const REVISION_ORDER: RevisionStatus[] = [
  'draft', 'under_review', 'changes_requested', 'approved', 'approved_with_comments', 'rejected', 'superseded',
]

const TRANSITIONS: Record<RevisionStatus, RevisionStatus[]> = {
  draft: ['under_review'],
  under_review: ['approved', 'approved_with_comments', 'changes_requested', 'rejected'],
  changes_requested: ['under_review'],
  approved: [],
  approved_with_comments: [],
  rejected: [],
  superseded: [],
}

export function allowedRevisionTransitions(status: RevisionStatus): RevisionStatus[] {
  return TRANSITIONS[status]
}

export function isApproved(status: RevisionStatus): boolean {
  return status === 'approved' || status === 'approved_with_comments'
}

export function formatRevision(n: number): string {
  return `R${String(n).padStart(2, '0')}`
}
