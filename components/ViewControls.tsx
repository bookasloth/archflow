'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Popover } from '@/components/ui/Popover'

// Column keys mirror the TicketList columns (Ticket is always shown).
export const TICKET_COLUMNS: { key: string; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'location', label: 'Location' },
  { key: 'due', label: 'Due' },
]
const SORT_FIELDS = [
  { key: '', label: 'Default (newest)' },
  { key: 'title', label: 'Title' },
  { key: 'due_date', label: 'Due date' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
]
const GROUP_FIELDS = [
  { key: '', label: 'None' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'discipline', label: 'Discipline' },
]

function Row({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
        active ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

export function ViewControls() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const sort = params.get('sort') ?? ''            // "field:dir"
  const [sortField, sortDir] = sort.split(':')
  const group = params.get('group') ?? ''
  const hidden = new Set((params.get('hide') ?? '').split(',').filter(Boolean))

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value); else p.delete(key)
    router.replace(`${pathname}?${p.toString()}`)
  }
  function toggleHidden(key: string) {
    const next = new Set(hidden)
    next.has(key) ? next.delete(key) : next.add(key)
    setParam('hide', [...next].join(','))
  }

  return (
    <div className="inline-flex items-center gap-0.5">
      <Popover label={<>Sort{sortField && <span className="text-primary"> · 1</span>}</>}>
        {(close) => (
          <div className="space-y-0.5">
            {SORT_FIELDS.map((f) => (
              <Row key={f.key} active={sortField === f.key || (!f.key && !sortField)}
                onClick={() => { setParam('sort', f.key ? `${f.key}:${sortDir || 'asc'}` : ''); close() }}>
                {f.label}
              </Row>
            ))}
            {sortField && (
              <div className="mt-1 border-t border-subtle pt-1">
                <Row active={sortDir !== 'desc'} onClick={() => setParam('sort', `${sortField}:asc`)}>Ascending</Row>
                <Row active={sortDir === 'desc'} onClick={() => setParam('sort', `${sortField}:desc`)}>Descending</Row>
              </div>
            )}
          </div>
        )}
      </Popover>

      <Popover label={<>Group{group && <span className="text-primary"> · 1</span>}</>}>
        {(close) => (
          <div className="space-y-0.5">
            {GROUP_FIELDS.map((f) => (
              <Row key={f.key} active={group === f.key || (!f.key && !group)}
                onClick={() => { setParam('group', f.key); close() }}>
                {f.label}
              </Row>
            ))}
          </div>
        )}
      </Popover>

      <Popover label="Properties">
        <div className="space-y-0.5">
          {TICKET_COLUMNS.map((c) => (
            <Row key={c.key} active={false} onClick={() => toggleHidden(c.key)}>
              <span>{c.label}</span>
              <span className={hidden.has(c.key) ? 'text-ink-faint' : 'text-primary'} aria-hidden>
                {hidden.has(c.key) ? 'Hidden' : 'Shown'}
              </span>
            </Row>
          ))}
        </div>
      </Popover>
    </div>
  )
}
