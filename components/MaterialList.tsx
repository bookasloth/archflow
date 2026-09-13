import Link from 'next/link'
import { categoryLabel } from '@/lib/materials'

type Row = {
  id: string; name: string; manufacturer: string | null; category: string
  status: string; room: string | null
}

export function MaterialList({ materials }: { materials: Row[] }) {
  if (materials.length === 0) return <p className="text-sm text-ink-muted">No materials yet.</p>
  return (
    <ul className="divide-y rounded border">
      {materials.map((m) => (
        <li key={m.id} className="flex items-center justify-between p-2 text-sm">
          <Link href={`/materials/${m.id}`} className="flex items-center gap-2">
            <span>{m.name}</span>
            {m.manufacturer && <span className="text-xs text-ink-faint">{m.manufacturer}</span>}
          </Link>
          <span className="flex gap-2 text-xs text-ink-muted">
            <span>{categoryLabel(m.category)}</span>
            {m.room && <span>{m.room}</span>}
            <span className="rounded bg-gray-100 px-2 py-0.5">{m.status}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
