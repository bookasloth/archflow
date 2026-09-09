'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { statusLabel, priorityLabel, disciplineLabel, type Discipline } from '@/lib/labels'
import type { TicketStatus } from '@/lib/status'
import type { Priority } from '@/lib/health'

type FilterRoom = { id: string; name: string }
type FilterFloor = { id: string; name: string; rooms: FilterRoom[] }
type FilterBuilding = { id: string; name: string; floors: FilterFloor[] }
type FilterAssignee = { id: string; full_name: string | null }

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'verified', 'closed']
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']
const DISCIPLINES: Discipline[] = [
  'architectural', 'structural', 'electrical', 'plumbing', 'fire_safety',
  'interior', 'landscape', 'construction', 'documentation', 'client_coordination',
]

export function TicketFilters({
  assignees = [],
  buildings = [],
}: {
  assignees?: FilterAssignee[]
  buildings?: FilterBuilding[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const isKanban = params.get('view') === 'kanban'

  const get = (k: string) => params.get(k) ?? ''

  function setMany(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    router.replace(`${pathname}?${p.toString()}`)
  }
  const set = (k: string, v: string) => setMany({ [k]: v })

  // cascading spatial options
  const selBuilding = buildings.find((b) => b.id === get('building'))
  const floors = selBuilding?.floors ?? buildings.flatMap((b) => b.floors)
  const selFloor = floors.find((f) => f.id === get('floor'))
  const rooms = selFloor?.rooms ?? floors.flatMap((f) => f.rooms)

  const opt = (empty: string, items: { value: string; label: string }[]) => [
    { value: '', label: empty },
    ...items,
  ]

  // active chips
  const chips: { key: string; label: string }[] = []
  if (get('q')) chips.push({ key: 'q', label: `“${get('q')}”` })
  if (get('status') && !isKanban) chips.push({ key: 'status', label: statusLabel(get('status') as TicketStatus) })
  if (get('priority')) chips.push({ key: 'priority', label: priorityLabel(get('priority') as Priority) })
  if (get('discipline')) chips.push({ key: 'discipline', label: disciplineLabel(get('discipline') as Discipline) })
  if (get('assignee')) {
    const a = assignees.find((x) => x.id === get('assignee'))
    chips.push({ key: 'assignee', label: a?.full_name ?? 'Assignee' })
  }
  if (get('building')) chips.push({ key: 'building', label: selBuilding?.name ?? 'Building' })
  if (get('floor')) chips.push({ key: 'floor', label: selFloor?.name ?? 'Floor' })
  if (get('room')) {
    const r = rooms.find((x) => x.id === get('room'))
    chips.push({ key: 'room', label: r?.name ?? 'Room' })
  }

  function clearAll() {
    const p = new URLSearchParams(params.toString())
    for (const k of ['q', 'status', 'priority', 'discipline', 'assignee', 'building', 'floor', 'room']) p.delete(k)
    router.replace(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <Input
          placeholder="Search tickets…"
          value={get('q')}
          onChange={(e) => set('q', e.target.value)}
          className="w-48"
          aria-label="Search tickets"
        />
        {!isKanban && (
          <Select aria-label="Status" value={get('status')} onChange={(e) => set('status', e.target.value)}
            options={opt('Any status', STATUSES.map((s) => ({ value: s, label: statusLabel(s) })))} />
        )}
        <Select aria-label="Priority" value={get('priority')} onChange={(e) => set('priority', e.target.value)}
          options={opt('Any priority', PRIORITIES.map((p) => ({ value: p, label: priorityLabel(p) })))} />
        <Select aria-label="Discipline" value={get('discipline')} onChange={(e) => set('discipline', e.target.value)}
          options={opt('Any discipline', DISCIPLINES.map((d) => ({ value: d, label: disciplineLabel(d) })))} />
        <Select aria-label="Assignee" value={get('assignee')} onChange={(e) => set('assignee', e.target.value)}
          options={opt('Any assignee', assignees.map((a) => ({ value: a.id, label: a.full_name ?? 'Unnamed' })))} />
        <Select aria-label="Building" value={get('building')}
          onChange={(e) => setMany({ building: e.target.value, floor: '', room: '' })}
          options={opt('Any building', buildings.map((b) => ({ value: b.id, label: b.name })))} />
        <Select aria-label="Floor" value={get('floor')}
          onChange={(e) => setMany({ floor: e.target.value, room: '' })}
          options={opt('Any floor', floors.map((f) => ({ value: f.id, label: f.name })))} />
        <Select aria-label="Room" value={get('room')} onChange={(e) => set('room', e.target.value)}
          options={opt('Any room', rooms.map((r) => ({ value: r.id, label: r.name })))} />
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => set(c.key, '')}
              className="inline-flex items-center gap-1 rounded bg-surface-hover px-1.5 py-0.5 text-ink-muted hover:text-ink"
            >
              {c.label}
              <span aria-hidden>×</span>
            </button>
          ))}
          <button onClick={clearAll} className="ml-1 text-ink-faint hover:text-ink">Clear all</button>
        </div>
      )}
    </div>
  )
}
