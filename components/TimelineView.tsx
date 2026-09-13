'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyState } from '@/components/ui/EmptyState'
import { STATUS_COLOR } from '@/lib/ticket-colors'
import type { TicketStatus } from '@/lib/status'
import type { CalTicket } from '@/components/CalendarView'

const DAY = 86400000
function toUTC(s: string) { return Date.parse(s + 'T00:00:00Z') }

// Read-only schedule bars: start_date → due_date (single-day bar if only one is set).
// Drag-to-reschedule is deferred; click a bar to open the ticket.
export function TimelineView({ tickets }: { tickets: CalTicket[] }) {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams()

  const scheduled = tickets
    .map((t) => {
      const s = t.start_date ?? t.due_date
      const e = t.due_date ?? t.start_date
      if (!s || !e) return null
      const start = Math.min(toUTC(s), toUTC(e))
      const end = Math.max(toUTC(s), toUTC(e))
      return { t, start, end }
    })
    .filter((x): x is { t: CalTicket; start: number; end: number } => x !== null)
    .sort((a, b) => a.start - b.start)

  if (scheduled.length === 0)
    return <EmptyState title="Nothing scheduled" description="Give tickets a start or due date to see them on the timeline." />

  const min = Math.min(...scheduled.map((s) => s.start))
  const max = Math.max(...scheduled.map((s) => s.end))
  const span = Math.max(DAY, max - min + DAY)

  const pct = (ms: number) => ((ms - min) / span) * 100
  const fmt = (ms: number) => new Date(ms).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  function open(id: string) {
    const p = new URLSearchParams(params.toString()); p.set('ticket', id)
    router.replace(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between px-1 text-xs text-ink-faint">
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
      <div className="space-y-1 rounded-lg border border-subtle bg-surface p-3">
        {scheduled.map(({ t, start, end }) => {
          const left = pct(start)
          const width = Math.max(2, pct(end + DAY) - left)
          return (
            <div key={t.id} className="flex items-center gap-3">
              <button onClick={() => open(t.id)} className="w-40 shrink-0 truncate text-left text-xs text-ink hover:text-primary">
                <span className="font-mono text-ink-faint">{(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}</span> {t.title}
              </button>
              <div className="relative h-5 flex-1">
                <button
                  onClick={() => open(t.id)}
                  title={`${fmt(start)} → ${fmt(end)}`}
                  className="absolute top-0.5 flex h-4 items-center rounded px-1.5 text-[10px] text-white"
                  style={{ left: `${left}%`, width: `${width}%`, background: 'var(--primary)' }}
                >
                  <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${STATUS_COLOR[t.status as TicketStatus]}`} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
