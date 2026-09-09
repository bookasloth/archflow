# Slice 5 — Shared filters + search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** One shared, lightweight filter+search control (Search · Status · Priority · Discipline · Assignee · Building · Floor · Room) with active-filter chips, clear-all, and URL persistence — applied server-side to the ticket query so BOTH Table and Kanban respect it. Also delivers the form primitives (Field/Input/Select) deferred from Slice 2.

**Architecture:** New `components/ui/Field.tsx` + `Input.tsx` + `Select.tsx`. A client `components/TicketFilters.tsx` (replacing the old one) reads/writes URL params, renders search + selects (spatial selects cascade building→floor→room), and shows active chips + Clear all. The project page fetches assignee options (profiles) and passes the already-fetched hierarchy; its ticket query applies all params.

**Tech Stack:** Next.js 15, React 19, Supabase, Tailwind. No new deps.

**Spec:** roadmap Slice 5 (P1). Base: `feat/ux-foundation` (stacked on Slice 4).

## Global Constraints
- No new deps, no schema changes. URL params only (no state library).
- Status filter applies in TABLE view only (hidden in Kanban — columns are status); Priority/Discipline/Assignee/Building/Floor/Room/Search apply in BOTH views.
- Server-side filtering in the existing project-page query (extend it); do not filter client-side.
- Reuse `lib/labels.ts` for status/priority/discipline chip labels. Reuse existing tokens/Slice-2 primitives.
- Replace the existing `components/TicketFilters.tsx` (keep the same file path/export name so the page import is unchanged where possible).
- Search matches ticket `title` (case-insensitive `ilike`), guarded for empty input.

---

### Task 1: Form primitives (Field, Input, Select)

**Files:**
- Create: `components/ui/Field.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Select.tsx`

**Interfaces produced:**
- `Field({ label?, htmlFor?, children })` — a labeled wrapper (small muted label above the control).
- `Input(props: InputHTMLAttributes)` — token-styled text input, forwardRef.
- `Select({ options, ...selectProps })` where `options: { value: string; label: string }[]` — token-styled native select, forwardRef.

- [ ] **Step 1: `components/ui/Input.tsx`**

```tsx
import { forwardRef, type InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`h-8 rounded border border-subtle bg-surface px-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${className}`}
        {...props}
      />
    )
  },
)
```

- [ ] **Step 2: `components/ui/Select.tsx`**

```tsx
import { forwardRef, type SelectHTMLAttributes } from 'react'

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }
>(function Select({ options, className = '', ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`h-8 rounded border border-subtle bg-surface px-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${className}`}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
})
```

- [ ] **Step 3: `components/ui/Field.tsx`**

```tsx
import type { ReactNode } from 'react'

export function Field({ label, htmlFor, children }: { label?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      {label && <span className="text-[11px] font-medium text-ink-faint">{label}</span>}
      {children}
    </label>
  )
}
```

- [ ] **Step 4: Verify + commit**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.

```bash
git add components/ui/Field.tsx components/ui/Input.tsx components/ui/Select.tsx
git commit -m "feat(ui): form primitives (Field, Input, Select)"
```

---

### Task 2: Shared `TicketFilters` (search + selects + chips + clear-all)

**Files:**
- Modify (replace): `components/TicketFilters.tsx`

**Interfaces produced:** `TicketFilters({ assignees?, buildings? })` (both OPTIONAL, default `[]` — so the page's existing prop-less call still compiles after this task; Task 3 supplies real data) where
```ts
type FilterAssignee = { id: string; full_name: string | null }
type FilterRoom = { id: string; name: string }
type FilterFloor = { id: string; name: string; rooms: FilterRoom[] }
type FilterBuilding = { id: string; name: string; floors: FilterFloor[] }
// props: { assignees: FilterAssignee[]; buildings: FilterBuilding[] }
```
Reads/writes URL params: `q, status, priority, discipline, assignee, building, floor, room`. Consumed by the project page (Task 3).

- [ ] **Step 1: Replace `components/TicketFilters.tsx`**

```tsx
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
          defaultValue={get('q')}
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
```

- [ ] **Step 2: Verify + commit**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean. (Component not yet wired — page passes props in Task 3.)

```bash
git add components/TicketFilters.tsx
git commit -m "feat(ui): shared ticket filters — search, status/priority/discipline/assignee/spatial, chips, clear-all"
```

---

### Task 3: Wire filters + server-side filtering into the project page

**Files:**
- Modify: `app/(app)/projects/[id]/page.tsx`

**Interfaces:** passes `assignees` + `buildings` to `TicketFilters`; applies all filter params to the ticket query.

- [ ] **Step 1: Fetch assignee options + widen searchParams typing**

In `app/(app)/projects/[id]/page.tsx`, widen the `searchParams` type to include the new keys:
```tsx
searchParams: Promise<{
  status?: string; discipline?: string; view?: string; ktype?: string; ticket?: string
  q?: string; priority?: string; assignee?: string; building?: string; floor?: string; room?: string
}>
```
Add a profiles fetch for the assignee dropdown (after the buildings fetch):
```tsx
  const { data: profiles } = await supabase.from('profiles').select('id, full_name').order('full_name')
```

- [ ] **Step 2: Apply all filters in the ticket query**

Replace the filter conditionals block with:
```tsx
  let q = supabase
    .from('tickets')
    .select('id, seq, type, discipline, title, status, priority, due_date, assignee:assignee_id(full_name), building:building_id(name), floor:floor_id(name), room:room_id(name)')
    .eq('project_id', id)
    .order('seq', { ascending: false })
  if (sp.status && view === 'table') q = q.eq('status', sp.status as never)
  if (sp.discipline) q = q.eq('discipline', sp.discipline as never)
  if (sp.priority) q = q.eq('priority', sp.priority as never)
  if (sp.assignee) q = q.eq('assignee_id', sp.assignee)
  if (sp.building) q = q.eq('building_id', sp.building)
  if (sp.floor) q = q.eq('floor_id', sp.floor)
  if (sp.room) q = q.eq('room_id', sp.room)
  if (sp.q) q = q.ilike('title', `%${sp.q}%`)
  const { data: tickets } = await q
```

- [ ] **Step 3: Pass props to `TicketFilters`**

Update the render to pass the option data (the `TicketFilters` import path is unchanged):
```tsx
        <div className="flex items-center justify-between">
          <TicketFilters
            assignees={(profiles as { id: string; full_name: string | null }[]) ?? []}
            buildings={(buildings as never) ?? []}
          />
          <ViewSwitcher />
        </div>
```
(`buildings` is already fetched with `id, name, floors(id, name, rooms(id, name))` — matching the `FilterBuilding` shape.)

- [ ] **Step 4: Verify**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.
Run: `cd "<worktree>" && npx vitest run` → green (33/33).
Manual (user, auth-gated): each filter narrows both Table and Kanban (status only in Table); search narrows by title; building→floor→room cascade; chips appear per active filter and remove on click; Clear all resets; filters persist in the URL across refresh; empty result shows the EmptyState.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/projects/[id]/page.tsx"
git commit -m "feat(ui): apply shared filters server-side + wire assignee/hierarchy options"
```

---

## Self-Review notes
- **Spec coverage:** search + status + priority + discipline + assignee + building/floor/room (T2/T3); chips + clear-all + URL persistence (T2); server-side apply, both views (T3); status table-only (T2 hides select, T3 guards query with `view==='table'`); form primitives delivered (T1).
- **Placeholder scan:** none. `<worktree>` = controller-supplied path.
- **Type consistency:** `FilterBuilding/Floor/Room/Assignee` in `TicketFilters` (T2) match the page's `buildings` embed shape and the `profiles` fetch (T3). `Discipline` from `lib/labels`; `Priority` from `lib/health`; `TicketStatus` from `lib/status`.
- **Constraint check:** no deps/schema; URL-param state; server-side filtering; status table-only; reuses labels + primitives. Cascading resets floor/room when building changes (and room when floor changes) to avoid stale spatial selections.
- **Note:** props are OPTIONAL with `[]` defaults, so the page's existing prop-less `<TicketFilters />` still compiles after Task 2; Task 3 supplies real assignee/hierarchy data. Each task stays tsc-green independently.
