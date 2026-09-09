import { reviewRevision } from '@/app/(app)/drawing-actions'
import { allowedRevisionTransitions, formatRevision, type RevisionStatus } from '@/lib/revision-status'

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
  if (revisions.length === 0) return <p className="text-sm text-gray-500">No revisions yet.</p>
  return (
    <ul className="divide-y rounded border">
      {revisions.map((r) => (
        <li key={r.id} className="flex items-center justify-between p-2 text-sm">
          <span className="flex items-center gap-3">
            <span className="font-mono">{formatRevision(r.revision_no)}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{r.status}</span>
            <span className="text-xs text-gray-500">{r.uploader ?? 'someone'}</span>
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
