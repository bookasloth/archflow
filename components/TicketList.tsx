'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { StatusBadge, PriorityBadge, DisciplineBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { TicketStatus } from '@/lib/status'
import type { Priority } from '@/lib/health'
import type { Discipline } from '@/lib/labels'

type Named = { name: string } | null
type Row = {
  id: string
  seq: number
  type: string
  discipline: string
  title: string
  status: string
  priority: string
  due_date: string | null
  assignee: { full_name: string | null } | null
  building: Named
  floor: Named
  room: Named
}

function locationOf(t: Row): string {
  const parts = [t.building?.name, t.floor?.name, t.room?.name].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
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
    <div className="overflow-x-auto rounded-lg border border-subtle bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-subtle text-left text-xs font-medium text-ink-faint">
            <th className="px-3 py-2 font-medium">Ticket</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Priority</th>
            <th className="px-3 py-2 font-medium">Discipline</th>
            <th className="px-3 py-2 font-medium">Assignee</th>
            <th className="px-3 py-2 font-medium">Location</th>
            <th className="px-3 py-2 font-medium">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-subtle">
          {tickets.map((t) => (
            <tr key={t.id} className="hover:bg-surface-hover">
              <td className="px-3 py-2">
                <button
                  onClick={() => open(t.id)}
                  className="flex min-w-0 items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
                >
                  <span className="font-mono text-xs text-ink-faint">
                    {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
                  </span>
                  <span className="truncate text-ink">{t.title}</span>
                </button>
              </td>
              <td className="px-3 py-2"><StatusBadge status={t.status as TicketStatus} /></td>
              <td className="px-3 py-2"><PriorityBadge priority={t.priority as Priority} /></td>
              <td className="px-3 py-2"><DisciplineBadge discipline={t.discipline as Discipline} /></td>
              <td className="px-3 py-2 text-ink-muted">{t.assignee?.full_name ?? '—'}</td>
              <td className="px-3 py-2 text-ink-muted">{locationOf(t)}</td>
              <td className="px-3 py-2 text-ink-muted">{t.due_date ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
