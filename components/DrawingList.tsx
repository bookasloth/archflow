import Link from 'next/link'
import { formatRevision, type RevisionStatus } from '@/lib/revision-status'
import { RevisionBadge, DisciplineBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Discipline } from '@/lib/labels'

type Row = {
  id: string; drawing_number: string | null; title: string; discipline: string | null
  latestNo: number | null; latestStatus: string | null
}

export function DrawingList({ drawings }: { drawings: Row[] }) {
  if (drawings.length === 0)
    return <EmptyState title="No drawings yet" description="Drawings you add to this project will appear here with their revision history." />
  return (
    <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
      {drawings.map((d) => (
        <li key={d.id} className="hover:bg-surface-hover">
          <Link href={`/drawings/${d.id}`} className="flex items-center justify-between gap-3 p-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {d.drawing_number && <span className="font-mono text-xs text-ink-faint">{d.drawing_number}</span>}
              <span className="truncate text-ink">{d.title}</span>
              {d.discipline && <DisciplineBadge discipline={d.discipline as Discipline} />}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-ink-muted">
              {d.latestNo ? (
                <>
                  <span>{formatRevision(d.latestNo)}</span>
                  {d.latestStatus && <RevisionBadge status={d.latestStatus as RevisionStatus} />}
                </>
              ) : (
                <span className="text-ink-faint">no revisions</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
