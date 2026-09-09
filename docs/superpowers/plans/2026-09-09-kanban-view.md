# Kanban View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Kanban board as a second view of the existing ticket system on the project page, synchronized with the existing Table view.

**Architecture:** A `?view=table|kanban` switch on the existing server page (`app/(app)/projects/[id]/page.tsx`) branches between the untouched `TicketList` and a new client `KanbanBoard`. The board groups the same server-fetched tickets into status columns derived from `lib/status.ts`, split by ticket type. Drag uses native HTML5 DnD, respects the existing per-type state machine, and persists via the existing `changeStatus` action with optimistic UI (`useOptimistic`). Cards open a new client `TicketDrawer` (via `?ticket=<id>`) that reuses the existing detail components; the board stays mounted behind it.

**Tech Stack:** Next.js 15 App Router (RSC + Server Actions), React 19 (`useOptimistic`, `useTransition`), Supabase (`@supabase/ssr`), Tailwind, Vitest (node env, lib-only unit tests).

**Spec:** `docs/superpowers/specs/2026-09-09-kanban-view-design.md`

## Global Constraints

- No new npm dependencies (native HTML5 DnD only).
- No DB schema/migration changes.
- Do not modify: `components/TicketList.tsx`, `lib/status.ts` rules, `app/(app)/tickets/[id]/page.tsx`, `NewTicketForm`, any drawing/media/material code.
- Domain term is "ticket". `type` is `'task' | 'site_issue'`; `TicketStatus` is `'open' | 'in_progress' | 'resolved' | 'verified' | 'closed'`.
- Status changes must go through `changeStatus` (enforces `canTransition`, incl. verified-needs-after-photo). Never write `status` directly from the client.
- Follow existing style: inline Tailwind utility classes, `@/` import alias, server actions take `FormData`, mutations call `revalidatePath`.
- Per-column task creation is v2 — out of scope.

---

### Task 1: Column derivation lib

**Files:**
- Create: `lib/kanban-columns.ts`
- Test: `tests/kanban-columns.test.ts`

**Interfaces:**
- Consumes: `allowedTransitions`, `TicketType`, `TicketStatus` from `@/lib/status`.
- Produces: `columnsFor(type: TicketType): TicketStatus[]` — ordered list of statuses that the given type actually uses, in canonical display order. `STATUS_ORDER: TicketStatus[]` (exported).

- [ ] **Step 1: Write the failing test**

```ts
// tests/kanban-columns.test.ts
import { describe, it, expect } from 'vitest'
import { columnsFor } from '@/lib/kanban-columns'

describe('columnsFor', () => {
  it('task uses only open, in_progress, closed (never resolved/verified)', () => {
    expect(columnsFor('task')).toEqual(['open', 'in_progress', 'closed'])
  })
  it('site_issue uses the full pipeline in order', () => {
    expect(columnsFor('site_issue')).toEqual([
      'open', 'in_progress', 'resolved', 'verified', 'closed',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/kanban-columns.test.ts`
Expected: FAIL — cannot find module `@/lib/kanban-columns`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/kanban-columns.ts
import { allowedTransitions, type TicketType, type TicketStatus } from '@/lib/status'

export const STATUS_ORDER: TicketStatus[] = [
  'open', 'in_progress', 'resolved', 'verified', 'closed',
]

// Derive which statuses a type actually uses from its transition graph:
// a status is "used" if it has outgoing transitions or is a transition target.
export function columnsFor(type: TicketType): TicketStatus[] {
  const used = new Set<TicketStatus>()
  for (const s of STATUS_ORDER) {
    const next = allowedTransitions(type, s)
    if (next.length > 0) used.add(s)
    for (const t of next) used.add(t)
  }
  return STATUS_ORDER.filter((s) => used.has(s))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/kanban-columns.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/kanban-columns.ts tests/kanban-columns.test.ts
git commit -m "feat(kanban): derive status columns per ticket type"
```

---

### Task 2: Server actions — status result + project revalidate + detail getter

**Files:**
- Modify: `app/(app)/actions.ts` (the `changeStatus` function; add `getTicketDetail`)

**Interfaces:**
- Consumes: `createClient` (`@/lib/supabase/server`), `canTransition`, `TicketType`, `TicketStatus` (`@/lib/status`), `signedUrl` (`@/app/(app)/media-actions`), `revalidatePath`.
- Produces:
  - `changeStatus(formData: FormData): Promise<{ ok: boolean; error?: string }>` — now returns a result and revalidates both the ticket and project paths. Reads `ticket_id`, `to`.
  - `getTicketDetail(id: string): Promise<TicketDetail | null>` where
    ```ts
    type TicketDetail = {
      id: string; seq: number; type: TicketType; discipline: string
      title: string; description: string | null; status: TicketStatus
      priority: string; due_date: string | null; project_id: string
      drawing_id: string | null
      photos: { url: string; markers: { x: number; y: number; label: string | null }[]; kind: string }[]
      comments: { id: string; body: string; created_at: string; author: string | null }[]
    }
    ```

**Note:** `changeStatus`'s existing `<form action={changeStatus}>` usage in `StatusControl` ignores the return value — safe. Do NOT change `StatusControl`.

- [ ] **Step 1: Replace `changeStatus` with a result-returning version that revalidates the project path**

Find the current `changeStatus` in `app/(app)/actions.ts` and replace it with:

```ts
export async function changeStatus(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const id = String(formData.get('ticket_id'))
  const to = String(formData.get('to')) as TicketStatus
  const { data: t } = await supabase
    .from('tickets')
    .select('type, status, project_id')
    .eq('id', id)
    .single()
  if (!t) return { ok: false, error: 'Ticket not found' }
  const { count } = await supabase
    .from('attachments')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_id', id)
    .eq('kind', 'after')
  const ok = canTransition(t.type as TicketType, t.status as TicketStatus, to, {
    hasAfterPhoto: (count ?? 0) > 0,
  })
  if (!ok) {
    return {
      ok: false,
      error:
        to === 'verified'
          ? 'Cannot verify without an after-photo.'
          : `Cannot move from ${t.status} to ${to}.`,
    }
  }
  await supabase.from('tickets').update({ status: to }).eq('id', id)
  revalidatePath(`/tickets/${id}`)
  revalidatePath(`/projects/${t.project_id}`)
  return { ok: true }
}
```

- [ ] **Step 2: Add `getTicketDetail` at the end of `app/(app)/actions.ts`**

First add this import at the top of the file (alongside the existing imports):

```ts
import { signedUrl } from '@/app/(app)/media-actions'
```

Then append:

```ts
export async function getTicketDetail(id: string) {
  const supabase = await createClient()
  const { data: t } = await supabase
    .from('tickets')
    .select('id, seq, type, discipline, title, description, status, priority, due_date, project_id, drawing_id')
    .eq('id', id)
    .single()
  if (!t) return null

  const { data: atts } = await supabase
    .from('attachments')
    .select('id, storage_path, kind, issue_markers(x, y, label)')
    .eq('ticket_id', id)
  type AttRow = {
    storage_path: string
    kind: string
    issue_markers: { x: number; y: number; label: string | null }[]
  }
  const photos = await Promise.all(
    ((atts as unknown as AttRow[]) ?? []).map(async (a) => ({
      url: await signedUrl(a.storage_path),
      markers: a.issue_markers ?? [],
      kind: a.kind,
    })),
  )

  const { data: comments } = await supabase
    .from('comments')
    .select('id, body, created_at, profiles(full_name)')
    .eq('ticket_id', id)
    .order('created_at')
  type CmtRow = {
    id: string; body: string; created_at: string
    profiles: { full_name: string | null } | null
  }
  const mapped = ((comments as unknown as CmtRow[]) ?? []).map((c) => ({
    id: c.id, body: c.body, created_at: c.created_at,
    author: c.profiles?.full_name ?? null,
  }))

  return { ...t, photos, comments: mapped }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors from `app/(app)/actions.ts`.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/actions.ts"
git commit -m "feat(kanban): changeStatus returns result + revalidates project; add getTicketDetail"
```

---

### Task 3: View switcher + wire project page

**Files:**
- Create: `components/ViewSwitcher.tsx`
- Modify: `app/(app)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ViewSwitcher` (client) — two segmented buttons writing `?view=table|kanban` via `useSearchParams`/`router.replace`, same pattern as `TicketFilters`. Project page now reads `searchParams.view` (default `'table'`) and `searchParams.ktype`; its ticket query adds `assignee:assignee_id(full_name)`; it skips the `status` filter when `view==='kanban'`.

- [ ] **Step 1: Create `components/ViewSwitcher.tsx`**

```tsx
'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const VIEWS = ['table', 'kanban'] as const

export function ViewSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const active = params.get('view') === 'kanban' ? 'kanban' : 'table'

  function set(view: string) {
    const p = new URLSearchParams(params.toString())
    if (view === 'table') p.delete('view')
    else p.set('view', view)
    router.replace(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="inline-flex rounded border text-sm" role="tablist" aria-label="View">
      {VIEWS.map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={active === v}
          onClick={() => set(v)}
          className={`px-3 py-1 capitalize first:rounded-l last:rounded-r ${
            active === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire the project page**

In `app/(app)/projects/[id]/page.tsx`:

(a) Add imports near the other component imports:

```tsx
import { ViewSwitcher } from '@/components/ViewSwitcher'
import { KanbanBoard } from '@/components/KanbanBoard'
```

(b) Widen the `searchParams` type and read the new params:

```tsx
searchParams: Promise<{ status?: string; discipline?: string; view?: string; ktype?: string }>
```

and after `const sp = await searchParams`:

```tsx
const view = sp.view === 'kanban' ? 'kanban' : 'table'
```

(c) Change the ticket query to include the assignee join, and skip the status filter in kanban:

```tsx
let q = supabase
  .from('tickets')
  .select('id, seq, type, discipline, title, status, priority, due_date, assignee:assignee_id(full_name)')
  .eq('project_id', id)
  .order('seq', { ascending: false })
if (sp.status && view === 'table') q = q.eq('status', sp.status as never)
if (sp.discipline) q = q.eq('discipline', sp.discipline as never)
const { data: tickets } = await q
```

(d) In the JSX, add the switcher to the toolbar row and branch the view. Replace the existing `<TicketFilters />` + `<TicketList ... />` block with:

```tsx
<div className="flex items-center justify-between">
  <TicketFilters />
  <ViewSwitcher />
</div>
{view === 'kanban' ? (
  <KanbanBoard tickets={(tickets as never) ?? []} />
) : (
  <TicketList tickets={(tickets as never) ?? []} />
)}
```

- [ ] **Step 3: Temporary stub so the page compiles before Task 5**

Create a minimal `components/KanbanBoard.tsx` stub (replaced fully in Task 5):

```tsx
'use client'
export function KanbanBoard({ tickets }: { tickets: unknown[] }) {
  return <div className="text-sm text-gray-500">Kanban ({tickets.length} tickets)</div>
}
```

- [ ] **Step 4: Verify build + switcher**

Run: `npx tsc --noEmit` (expect no new errors).
Then start the preview (browser tools): open the app, go to a project, and confirm the `Table | Kanban` switch toggles `?view=` and swaps the list for the stub. Confirm the Table view is unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/ViewSwitcher.tsx components/KanbanBoard.tsx "app/(app)/projects/[id]/page.tsx"
git commit -m "feat(kanban): view switcher + project page wiring (assignee join, view branch)"
```

---

### Task 4: Ticket card + status colors

**Files:**
- Create: `components/TicketCard.tsx`
- Create: `lib/ticket-colors.ts`

**Interfaces:**
- Consumes: `TicketStatus` (`@/lib/status`).
- Produces:
  - `STATUS_COLOR: Record<TicketStatus, string>` (Tailwind bg classes for a small accent dot).
  - `TicketCard` (client) — props:
    ```ts
    type CardTicket = {
      id: string; seq: number; type: 'task' | 'site_issue'
      discipline: string; title: string; status: TicketStatus
      priority: string; due_date: string | null
      assignee: { full_name: string | null } | null
    }
    // props: { ticket: CardTicket; onOpen: (id: string) => void;
    //          onDragStart: (t: CardTicket) => void; onDragEnd: () => void }
    ```

- [ ] **Step 1: Create `lib/ticket-colors.ts`**

```ts
// ponytail: plain lookup, no test — a static map can't drift silently.
import type { TicketStatus } from '@/lib/status'

export const STATUS_COLOR: Record<TicketStatus, string> = {
  open: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  resolved: 'bg-amber-500',
  verified: 'bg-violet-500',
  closed: 'bg-green-500',
}
```

- [ ] **Step 2: Create `components/TicketCard.tsx`**

```tsx
'use client'
import type { TicketStatus } from '@/lib/status'

export type CardTicket = {
  id: string
  seq: number
  type: 'task' | 'site_issue'
  discipline: string
  title: string
  status: TicketStatus
  priority: string
  due_date: string | null
  assignee: { full_name: string | null } | null
}

export function TicketCard({
  ticket,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  ticket: CardTicket
  onOpen: (id: string) => void
  onDragStart: (t: CardTicket) => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', ticket.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(ticket)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(ticket.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(ticket.id)
        }
      }}
      role="button"
      tabIndex={0}
      className="cursor-pointer space-y-1 rounded border bg-white p-2 text-sm shadow-sm hover:border-gray-400"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-gray-500">
          {(ticket.type === 'site_issue' ? 'SITE-' : 'TASK-') + ticket.seq}
        </span>
        <span className="text-xs text-gray-500">{ticket.priority}</span>
      </div>
      <div className="font-medium">{ticket.title}</div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{ticket.discipline}</span>
        {ticket.due_date && <span>due {ticket.due_date}</span>}
      </div>
      {ticket.assignee?.full_name && (
        <div className="text-xs text-gray-600">{ticket.assignee.full_name}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors. (Card is exercised visually in Task 5.)

- [ ] **Step 4: Commit**

```bash
git add components/TicketCard.tsx lib/ticket-colors.ts
git commit -m "feat(kanban): ticket card + status color accents"
```

---

### Task 5: Kanban board — columns, drag, optimistic status

**Files:**
- Modify: `components/KanbanBoard.tsx` (replace the Task 3 stub)

**Interfaces:**
- Consumes: `columnsFor`, `STATUS_ORDER` (`@/lib/kanban-columns`), `allowedTransitions`, `TicketType`, `TicketStatus` (`@/lib/status`), `STATUS_COLOR` (`@/lib/ticket-colors`), `TicketCard` + `CardTicket` (`@/components/TicketCard`), `changeStatus` (`@/app/(app)/actions`), `useRouter`/`usePathname`/`useSearchParams` (`next/navigation`).
- Produces: `KanbanBoard` (client) — props `{ tickets: (CardTicket & { project_id?: string })[] }`. Splits by `?ktype`, groups by status, native-DnD moves via `changeStatus` with `useOptimistic`. Opens a ticket by setting `?ticket=<id>`.

- [ ] **Step 1: Replace `components/KanbanBoard.tsx`**

```tsx
'use client'
import { useOptimistic, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { allowedTransitions, type TicketStatus, type TicketType } from '@/lib/status'
import { columnsFor } from '@/lib/kanban-columns'
import { STATUS_COLOR } from '@/lib/ticket-colors'
import { TicketCard, type CardTicket } from '@/components/TicketCard'
import { changeStatus } from '@/app/(app)/actions'

const TYPES: { key: TicketType; label: string }[] = [
  { key: 'task', label: 'Task' },
  { key: 'site_issue', label: 'Site' },
]

export function KanbanBoard({ tickets }: { tickets: CardTicket[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const activeType: TicketType = params.get('ktype') === 'site_issue' ? 'site_issue' : 'task'

  const [, startTransition] = useTransition()
  const [optTickets, applyMove] = useOptimistic(
    tickets,
    (state: CardTicket[], move: { id: string; to: TicketStatus }) =>
      state.map((t) => (t.id === move.id ? { ...t, status: move.to } : t)),
  )
  const [dragging, setDragging] = useState<CardTicket | null>(null)
  const [error, setError] = useState<string | null>(null)

  const columns = columnsFor(activeType)
  const shown = optTickets.filter((t) => t.type === activeType)
  const legalTargets = dragging
    ? allowedTransitions(dragging.type, dragging.status)
    : []

  function setParam(key: string, value: string | null) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.replace(`${pathname}?${p.toString()}`)
  }

  function move(ticket: CardTicket, to: TicketStatus) {
    if (ticket.status === to) return
    if (!allowedTransitions(ticket.type, ticket.status).includes(to)) return
    setError(null)
    startTransition(async () => {
      applyMove({ id: ticket.id, to })
      const fd = new FormData()
      fd.set('ticket_id', ticket.id)
      fd.set('to', to)
      const res = await changeStatus(fd)
      // On success the action revalidates and fresh props reconcile the state.
      // On failure no revalidation happens, so useOptimistic auto-reverts.
      if (!res.ok) setError(res.error ?? 'Move failed')
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded border text-sm">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setParam('ktype', t.key === 'task' ? null : t.key)}
              aria-pressed={activeType === t.key}
              className={`px-3 py-1 first:rounded-l last:rounded-r ${
                activeType === t.key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((status) => {
          const cards = shown.filter((t) => t.status === status)
          const isTarget = dragging != null && legalTargets.includes(status)
          return (
            <div
              key={status}
              onDragOver={(e) => {
                if (isTarget) e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging && isTarget) move(dragging, status)
                setDragging(null)
              }}
              className={`flex min-h-[8rem] w-64 shrink-0 flex-col gap-2 rounded border p-2 ${
                isTarget ? 'border-blue-400 bg-blue-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLOR[status]}`} />
                <span className="capitalize">{status.replace('_', ' ')}</span>
                <span className="text-gray-400">· {cards.length}</span>
              </div>
              {cards.length === 0 ? (
                <div className="rounded border border-dashed p-3 text-center text-xs text-gray-400">
                  No tickets
                </div>
              ) : (
                cards.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onOpen={(id) => setParam('ticket', id)}
                    onDragStart={setDragging}
                    onDragEnd={() => setDragging(null)}
                  />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verify in the browser preview**

Start the preview, open a project with tickets, switch to Kanban:
- Columns appear per type (Task shows open/in_progress/closed; Site shows all five). Type toggle switches pipelines and updates `?ktype`.
- Empty columns show "No tickets" and still highlight when a legal card is dragged.
- Drag a task open→in_progress: card moves immediately and stays after a browser refresh.
- Drag along an illegal edge (e.g. task open→closed is legal, but attempt open→open no-op; for site try open→verified): only legal columns highlight; an illegal drop is not accepted, and if the server rejects (e.g. site in_progress→resolved is fine, but verified without an after-photo), the card snaps back and a red message shows.
- Column counts match visible cards.

- [ ] **Step 4: Commit**

```bash
git add components/KanbanBoard.tsx
git commit -m "feat(kanban): board with columns, native drag, optimistic status via changeStatus"
```

---

### Task 6: Ticket drawer + open-on-param

**Files:**
- Create: `components/TicketDrawer.tsx`
- Modify: `components/KanbanBoard.tsx` (render the drawer)

**Interfaces:**
- Consumes: `getTicketDetail` (`@/app/(app)/actions`), existing `StatusControl`, `BeforeAfter`, `AddPhoto`, `CommentThread`, `usePathname`/`useRouter`/`useSearchParams`.
- Produces: `TicketDrawer` (client) — reads `?ticket=<id>`; when present, loads detail via `getTicketDetail` and renders a right-side slide-in over a scrim reusing existing detail components; closing clears `?ticket`. Renders nothing when the param is absent.

- [ ] **Step 1: Create `components/TicketDrawer.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getTicketDetail } from '@/app/(app)/actions'
import { StatusControl } from '@/components/StatusControl'
import { BeforeAfter } from '@/components/BeforeAfter'
import { AddPhoto } from '@/components/AddPhoto'
import { CommentThread } from '@/components/CommentThread'
import type { TicketType, TicketStatus } from '@/lib/status'
import type { Marker } from '@/components/PhotoMarker'

type Detail = Awaited<ReturnType<typeof getTicketDetail>>

export function TicketDrawer() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const id = params.get('ticket')
  const [detail, setDetail] = useState<Detail>(null)
  const [loading, setLoading] = useState(false)

  function close() {
    const p = new URLSearchParams(params.toString())
    p.delete('ticket')
    router.replace(`${pathname}?${p.toString()}`)
  }

  useEffect(() => {
    if (!id) {
      setDetail(null)
      return
    }
    let alive = true
    setLoading(true)
    getTicketDetail(id).then((d) => {
      if (alive) {
        setDetail(d)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!id) return null

  const before = detail?.photos.filter((p) => p.kind === 'before') ?? []
  const after = detail?.photos.filter((p) => p.kind === 'after') ?? []

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={close} aria-hidden />
      <aside
        role="dialog"
        aria-label="Ticket detail"
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl"
      >
        <button onClick={close} className="mb-3 text-sm text-gray-500 hover:text-gray-900">
          ✕ Close
        </button>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && !detail && <p className="text-sm text-gray-500">Not found.</p>}
        {detail && (
          <div className="space-y-5">
            <div>
              <div className="font-mono text-xs text-gray-500">
                {(detail.type === 'site_issue' ? 'SITE-' : 'TASK-') + detail.seq}
              </div>
              <h2 className="text-lg font-semibold">{detail.title}</h2>
              <div className="mt-1 flex gap-3 text-xs text-gray-500">
                <span>{detail.discipline}</span>
                <span>{detail.priority}</span>
                {detail.due_date && <span>due {detail.due_date}</span>}
              </div>
            </div>
            {detail.description && <p className="text-sm">{detail.description}</p>}
            <StatusControl
              id={detail.id}
              type={detail.type as TicketType}
              status={detail.status as TicketStatus}
            />
            {detail.type === 'site_issue' ? (
              <div className="space-y-3">
                <BeforeAfter
                  before={before.map((p) => ({ url: p.url, markers: p.markers as Marker[] }))}
                  after={after.map((p) => ({ url: p.url, markers: p.markers as Marker[] }))}
                />
                <AddPhoto ticketId={detail.id} projectId={detail.project_id} kind="after" />
              </div>
            ) : (
              detail.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p.url} alt="" className="max-w-full rounded" />
              ))
            )}
            <CommentThread ticketId={detail.id} comments={detail.comments} />
          </div>
        )}
      </aside>
    </div>
  )
}
```

**Note (verified):** `BeforeAfter` takes `before`/`after: { url: string; markers: Marker[] }[]` and `CommentThread` takes `comments: { id; body; created_at; author: string | null }[]` — both exactly what `getTicketDetail` returns, so the mappings above compile as written.

- [ ] **Step 2: Render the drawer from the board**

In `components/KanbanBoard.tsx`, add the import:

```tsx
import { TicketDrawer } from '@/components/TicketDrawer'
```

and render `<TicketDrawer />` once, just before the closing `</div>` of the outer `<div className="space-y-3">`.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verify in the browser preview**

- Click a card → drawer slides in from the right; the board is still visible behind it. Scroll the board first, open a card, close it — the board is at the same scroll position.
- In the drawer, use `StatusControl` to change status → after revalidation the board column reflects it, and switching to Table shows the same status.
- Add a comment in the drawer; for a site_issue, the before/after + AddPhoto render.
- `Esc` and the scrim and ✕ all close the drawer (clear `?ticket`).
- Load a URL with `?view=kanban&ticket=<id>` directly → drawer opens on load (deep-link).

- [ ] **Step 5: Commit**

```bash
git add components/TicketDrawer.tsx components/KanbanBoard.tsx
git commit -m "feat(kanban): right-side ticket drawer reusing detail components"
```

---

### Task 7: Hide status filter in Kanban + final integration pass

**Files:**
- Modify: `components/TicketFilters.tsx`

**Interfaces:**
- Consumes: `useSearchParams` (already imported).
- Produces: `TicketFilters` hides the **status** select when `view==='kanban'` (discipline stays). No prop change.

- [ ] **Step 1: Hide the status select in kanban view**

In `components/TicketFilters.tsx`, inside `TicketFilters`, derive the view and wrap the status `<select>` so it only renders in table view:

```tsx
const isKanban = params.get('view') === 'kanban'
```

Wrap the existing status `<select>` block:

```tsx
{!isKanban && (
  <select
    className="rounded border p-1"
    defaultValue={params.get('status') ?? ''}
    onChange={(e) => set('status', e.target.value)}
  >
    {STATUS.map((s) => (
      <option key={s} value={s}>{s || 'any status'}</option>
    ))}
  </select>
)}
```

Leave the discipline select as-is.

- [ ] **Step 2: Verify build + full flow**

Run: `npx tsc --noEmit` then `npx vitest run` (all tests pass, incl. Task 1).

In the browser preview, run the full checklist from the spec:
- Table → Kanban and back (view persists on refresh via `?view=`).
- Open a ticket from Kanban; edit in drawer; change status from drawer → reflected on board + table.
- Drag a task between columns; refresh → persists.
- Illegal drag / verified-without-photo → reverts with message.
- Discipline filter narrows both views; status filter hidden in Kanban, present in Table.
- Empty columns visible and drop-accepting.
- Many columns / narrow window → board scrolls horizontally, columns keep min width.

- [ ] **Step 3: Commit**

```bash
git add components/TicketFilters.tsx
git commit -m "feat(kanban): hide status filter in kanban view (columns are status)"
```

---

## Self-Review notes

- **Spec coverage:** view switcher (T3), split-by-type board (T5), columns from state machine (T1/T5), cards (T4), native DnD respecting transitions + optimistic (T5), changeStatus persistence + both-views sync via project revalidate (T2/T5), drawer reusing detail components + board-behind + position preserved + deep-link + a11y status alt (T6), filters reuse + status hidden in kanban (T7), discipline filter (T3 query/T7), empty columns (T5), counts (T5), responsive horizontal scroll (T5), permissions (none exist — unchanged), no schema change, no new deps. Out of scope per spec: reorder/position, per-column create, new filters, role read-only.
- **Placeholder scan:** none — all steps carry real code; `BeforeAfter`/`CommentThread` prop shapes verified against the components.
- **Type consistency:** `CardTicket` defined in T4, consumed in T5. `changeStatus` returns `{ok,error}` (T2) consumed in T5. `getTicketDetail` return type (T2) consumed via `Awaited<ReturnType<...>>` in T6. `columnsFor`/`STATUS_ORDER` (T1) consumed in T5. `STATUS_COLOR` (T4) consumed in T5.
