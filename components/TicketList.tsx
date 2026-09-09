'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { StatusBadge, PriorityBadge, DisciplineBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { TicketStatus } from '@/lib/status'
import type { Priority } from '@/lib/health'
import type { Discipline } from '@/lib/labels'

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
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function open(id: string) {
    const p = new URLSearchParams(params.toString())
    p.set('ticket', id)
    router.replace(`${pathname}?${p.toString()}`)
  }

  if (tickets.length === 0)
    return <EmptyState title="No tickets yet" description="Work items you create for this project will appear here." />

  return (
    <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
      {tickets.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 p-2.5 text-sm hover:bg-surface-hover">
          <button
            onClick={() => open(t.id)}
            className="flex min-w-0 items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
          >
            <span className="font-mono text-xs text-ink-faint">
              {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
            </span>
            <span className="truncate text-ink">{t.title}</span>
          </button>
          <span className="flex shrink-0 items-center gap-2">
            <DisciplineBadge discipline={t.discipline as Discipline} />
            <PriorityBadge priority={t.priority as Priority} />
            <StatusBadge status={t.status as TicketStatus} />
          </span>
        </li>
      ))}
    </ul>
  )
}
