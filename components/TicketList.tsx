'use client'
import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { StatusBadge, PriorityBadge, DisciplineBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { applySort, groupBy, type SortSpec } from '@/lib/view'
import { allowedTransitions, type TicketStatus, type TicketType } from '@/lib/status'
import { statusLabel, priorityLabel, disciplineLabel, type Discipline } from '@/lib/labels'
import { changeStatus } from '@/app/(app)/actions'
import type { Priority } from '@/lib/health'

type Named = { name: string } | null
type Row = {
  id: string; seq: number; type: string; discipline: string; title: string
  status: string; priority: string; due_date: string | null
  assignee: { full_name: string | null } | null
  building: Named; floor: Named; room: Named
}

function locationOf(t: Row): string {
  const parts = [t.building?.name, t.floor?.name, t.room?.name].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}
const GROUP_LABEL: Record<string, (v: string) => string> = {
  status: (v) => statusLabel(v as TicketStatus),
  priority: (v) => priorityLabel(v as Priority),
  discipline: (v) => disciplineLabel(v as Discipline),
}

export function TicketList({ tickets }: { tickets: Row[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const [sortField, sortDir] = (params.get('sort') ?? '').split(':')
  const sort: SortSpec | null = sortField ? { field: sortField, dir: sortDir === 'desc' ? 'desc' : 'asc' } : null
  const group = params.get('group') ?? ''
  const hidden = new Set((params.get('hide') ?? '').split(',').filter(Boolean))
  const show = (k: string) => !hidden.has(k)

  const sorted = applySort(tickets as unknown as Record<string, unknown>[], sort) as unknown as Row[]

  function open(id: string) {
    const p = new URLSearchParams(params.toString())
    p.set('ticket', id)
    router.replace(`${pathname}?${p.toString()}`)
  }
  function setStatus(t: Row, to: string) {
    if (to === t.status) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('ticket_id', t.id); fd.set('to', to)
      const res = await changeStatus(fd)
      if (res.ok) router.refresh()
    })
  }

  if (tickets.length === 0)
    return <EmptyState title="No tickets yet" description="Work items you create for this project will appear here." />

  const groups = group
    ? groupBy(sorted as unknown as Record<string, unknown>[], group).map((g) => ({ key: g.key, rows: g.rows as unknown as Row[] }))
    : [{ key: '', rows: sorted }]

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key}>
          {group && (
            <div className="mb-1 flex items-center gap-2 px-1 text-xs font-medium text-ink-muted">
              <span>{g.key === 'None' ? 'None' : (GROUP_LABEL[group]?.(g.key) ?? g.key)}</span>
              <span className="text-ink-faint">· {g.rows.length}</span>
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border border-subtle bg-surface">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-subtle text-left text-xs font-medium text-ink-faint">
                  <th className="px-3 py-2 font-medium">Ticket</th>
                  {show('status') && <th className="px-3 py-2 font-medium">Status</th>}
                  {show('priority') && <th className="px-3 py-2 font-medium">Priority</th>}
                  {show('discipline') && <th className="px-3 py-2 font-medium">Discipline</th>}
                  {show('assignee') && <th className="px-3 py-2 font-medium">Assignee</th>}
                  {show('location') && <th className="px-3 py-2 font-medium">Location</th>}
                  {show('due') && <th className="px-3 py-2 font-medium">Due</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {g.rows.map((t) => {
                  const targets = allowedTransitions(t.type as TicketType, t.status as TicketStatus)
                  return (
                    <tr key={t.id} className="hover:bg-surface-hover">
                      <td className="px-3 py-2">
                        <button onClick={() => open(t.id)}
                          className="flex min-w-0 items-center gap-2 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
                          <span className="font-mono text-xs text-ink-faint">{(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}</span>
                          <span className="truncate text-ink">{t.title}</span>
                        </button>
                      </td>
                      {show('status') && (
                        <td className="px-3 py-2">
                          {targets.length === 0 ? (
                            <StatusBadge status={t.status as TicketStatus} />
                          ) : (
                            <select
                              aria-label="Status"
                              value={t.status}
                              onChange={(e) => setStatus(t, e.target.value)}
                              className="rounded border border-subtle bg-surface px-1.5 py-0.5 text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                            >
                              <option value={t.status}>{statusLabel(t.status as TicketStatus)}</option>
                              {targets.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                            </select>
                          )}
                        </td>
                      )}
                      {show('priority') && <td className="px-3 py-2"><PriorityBadge priority={t.priority as Priority} /></td>}
                      {show('discipline') && <td className="px-3 py-2"><DisciplineBadge discipline={t.discipline as Discipline} /></td>}
                      {show('assignee') && <td className="px-3 py-2 text-ink-muted">{t.assignee?.full_name ?? '—'}</td>}
                      {show('location') && <td className="px-3 py-2 text-ink-muted">{locationOf(t)}</td>}
                      {show('due') && <td className="px-3 py-2 text-ink-muted">{t.due_date ?? '—'}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
