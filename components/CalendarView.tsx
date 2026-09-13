'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyState } from '@/components/ui/EmptyState'
import { STATUS_COLOR } from '@/lib/ticket-colors'
import type { TicketStatus } from '@/lib/status'

export type CalTicket = {
  id: string; seq: number; type: string; title: string; status: string
  due_date: string | null; start_date: string | null
}

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function iso(d: Date) { return d.toISOString().slice(0, 10) }
function monthParam(sp: URLSearchParams): { y: number; m: number } {
  const v = sp.get('month')
  if (v && /^\d{4}-\d{2}$/.test(v)) { const [y, m] = v.split('-').map(Number); return { y, m: m - 1 } }
  const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }
}

export function CalendarView({ tickets }: { tickets: CalTicket[] }) {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams()
  const { y, m } = monthParam(params)

  // Anchor date = due_date, else start_date.
  const byDay = new Map<string, CalTicket[]>()
  for (const t of tickets) {
    const day = t.due_date ?? t.start_date
    if (!day) continue
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(t)
  }

  const first = new Date(Date.UTC(y, m, 1))
  const startOffset = (first.getUTCDay() + 6) % 7 // Monday-based
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(y, m, d)))
  while (cells.length % 7 !== 0) cells.push(null)

  function go(deltaMonths: number) {
    const nd = new Date(Date.UTC(y, m + deltaMonths, 1))
    const p = new URLSearchParams(params.toString())
    p.set('month', `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, '0')}`)
    router.replace(`${pathname}?${p.toString()}`)
  }
  function open(id: string) {
    const p = new URLSearchParams(params.toString()); p.set('ticket', id)
    router.replace(`${pathname}?${p.toString()}`)
  }

  const label = first.toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const todayIso = iso(new Date())

  if (tickets.every((t) => !t.due_date && !t.start_date))
    return <EmptyState title="Nothing scheduled" description="Tickets with a start or due date show up on the calendar." />

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button onClick={() => go(-1)} className="rounded px-2 py-1 text-sm text-ink-muted hover:bg-surface-hover">‹</button>
        <span className="text-sm font-medium text-ink">{label}</span>
        <button onClick={() => go(1)} className="rounded px-2 py-1 text-sm text-ink-muted hover:bg-surface-hover">›</button>
        <button onClick={() => go(0)} className="ml-1 rounded border border-subtle px-2 py-0.5 text-xs text-ink-muted hover:bg-surface-hover">Today</button>
      </div>
      <div className="overflow-hidden rounded-lg border border-subtle bg-surface">
        <div className="grid grid-cols-7 border-b border-subtle text-[11px] font-medium text-ink-faint">
          {WD.map((d) => <div key={d} className="px-2 py-1.5">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const dayIso = d ? iso(d) : ''
            const items = d ? (byDay.get(dayIso) ?? []) : []
            return (
              <div key={i} className={`min-h-[92px] border-b border-r border-subtle p-1 last:border-r-0 ${d ? '' : 'bg-surface-hover/40'}`}>
                {d && (
                  <>
                    <div className={`mb-1 text-right text-[11px] ${dayIso === todayIso ? 'font-semibold text-primary' : 'text-ink-faint'}`}>{d.getUTCDate()}</div>
                    <div className="space-y-0.5">
                      {items.slice(0, 3).map((t) => (
                        <button key={t.id} onClick={() => open(t.id)}
                          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] hover:bg-surface-hover">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_COLOR[t.status as TicketStatus]}`} />
                          <span className="truncate text-ink">{t.title}</span>
                        </button>
                      ))}
                      {items.length > 3 && <div className="px-1 text-[10px] text-ink-faint">+{items.length - 3} more</div>}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
