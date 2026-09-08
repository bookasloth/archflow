import Link from 'next/link'

type Row = {
  id: string
  seq: number
  type: string
  discipline: string
  title: string
  status: string
  priority: string
  due_date: string | null
}

export function TicketList({ tickets }: { tickets: Row[] }) {
  if (tickets.length === 0) return <p className="text-sm text-gray-500">No tickets yet.</p>
  return (
    <ul className="divide-y rounded border">
      {tickets.map((t) => (
        <li key={t.id} className="flex items-center justify-between p-2 text-sm">
          <Link href={`/tickets/${t.id}`} className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500">
              {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
            </span>
            <span>{t.title}</span>
          </Link>
          <span className="flex gap-2 text-xs text-gray-500">
            <span>{t.discipline}</span>
            <span>{t.priority}</span>
            <span>{t.status}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
