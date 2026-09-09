import Link from 'next/link'
import { formatRevision } from '@/lib/revision-status'

type Row = {
  id: string; drawing_number: string | null; title: string; discipline: string | null
  latestNo: number | null; latestStatus: string | null
}

export function DrawingList({ drawings }: { drawings: Row[] }) {
  if (drawings.length === 0) return <p className="text-sm text-gray-500">No drawings yet.</p>
  return (
    <ul className="divide-y rounded border">
      {drawings.map((d) => (
        <li key={d.id} className="flex items-center justify-between p-2 text-sm">
          <Link href={`/drawings/${d.id}`} className="flex items-center gap-2">
            {d.drawing_number && <span className="font-mono text-xs text-gray-500">{d.drawing_number}</span>}
            <span>{d.title}</span>
            {d.discipline && <span className="text-xs text-gray-400">{d.discipline}</span>}
          </Link>
          <span className="text-xs text-gray-500">
            {d.latestNo ? `${formatRevision(d.latestNo)} · ${d.latestStatus}` : 'no revisions'}
          </span>
        </li>
      ))}
    </ul>
  )
}
