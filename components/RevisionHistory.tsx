import { reviewRevision } from '@/app/(app)/drawing-actions'
import { allowedRevisionTransitions, formatRevision, type RevisionStatus } from '@/lib/revision-status'
import { RevisionBadge } from '@/components/ui/Badge'

const LABEL: Record<string, string> = {
  under_review: 'Submit for review',
  approved: 'Approve',
  approved_with_comments: 'Approve w/ comments',
  changes_requested: 'Request changes',
  rejected: 'Reject',
}

type Rev = {
  id: string; revision_no: number; status: RevisionStatus
  created_at: string; uploader: string | null
}

export function RevisionHistory({ revisions }: { revisions: Rev[] }) {
  if (revisions.length === 0) return <p className="text-sm text-ink-muted">No revisions yet.</p>
  return (
    <ul className="divide-y rounded border">
      {revisions.map((r) => (
        <li key={r.id} className="flex items-center justify-between p-2 text-sm">
          <span className="flex items-center gap-3">
            <span className="font-mono">{formatRevision(r.revision_no)}</span>
            <RevisionBadge status={r.status} />
            <span className="text-xs text-ink-muted">{r.uploader ?? 'someone'}</span>
          </span>
          <span className="flex gap-1">
            {allowedRevisionTransitions(r.status).map((to) => (
              <form key={to} action={reviewRevision}>
                <input type="hidden" name="revision_id" value={r.id} />
                <input type="hidden" name="to" value={to} />
                <button type="submit" className="rounded border px-2 py-1 text-xs">{LABEL[to] ?? to}</button>
              </form>
            ))}
          </span>
        </li>
      ))}
    </ul>
  )
}
