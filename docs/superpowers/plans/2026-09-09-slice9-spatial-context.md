# Slice 9 — Spatial context operational — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Clicking a room opens a room view showing that room's Work, Site issues, and Materials; a contextual "New ticket" there pre-associates the room (building/floor/room). Makes the spatial hierarchy operational, not decorative.

**Architecture:** New route `app/(app)/projects/[id]/rooms/[roomId]/page.tsx` fetches the room's context + its tickets (reusing `TicketList` + `TicketDrawer`) + its materials. `NewTicketForm` gains optional `buildingId/floorId/roomId` props (hidden inputs consumed by the existing `createTicket`). `HierarchySidebar` room names become links.

**Tech Stack:** Next.js 15 RSC, Supabase, Tailwind. No new deps.

**Spec:** roadmap Slice 9 / P2 (§12, §11). Base: `feat/ux-foundation` (stacked on Slice 8).

## Global Constraints
- No new deps, no schema change. `createTicket` already reads `building_id/floor_id/room_id` from FormData — reuse it (do not change the action).
- Reuse `TicketList` (table + `?ticket=` drawer open), `TicketDrawer`, `PageHeader`, `Section`, `EmptyState`, badges.
- Drawings have no room FK (project-level) — room view covers Work + Site + Materials only (note the omission; drawings stay a project-level concern).
- Room-scoped tickets query uses the SAME select shape `TicketList` expects (assignee/building/floor/room embeds).
- Presentation + additive route only; no changes to Server Actions, RLS, or unrelated screens.

---

### Task 1: Contextual defaults + room links

**Files:**
- Modify: `components/NewTicketForm.tsx` (optional spatial defaults)
- Modify: `components/HierarchySidebar.tsx` (room names → links)

**Interfaces produced:** `NewTicketForm({ projectId, revisionOptions?, buildingId?, floorId?, roomId? })` — when the spatial ids are provided it emits hidden `building_id/floor_id/room_id` inputs so the created ticket is pre-associated.

- [ ] **Step 1: Extend `components/NewTicketForm.tsx`**

Add the optional props and hidden inputs (keep everything else identical):

```tsx
export function NewTicketForm({ projectId, revisionOptions = [], buildingId, floorId, roomId }:
  { projectId: string; revisionOptions?: RevisionOption[]; buildingId?: string; floorId?: string; roomId?: string }) {
  return (
    <form action={createTicket} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="project_id" value={projectId} />
      {buildingId && <input type="hidden" name="building_id" value={buildingId} />}
      {floorId && <input type="hidden" name="floor_id" value={floorId} />}
      {roomId && <input type="hidden" name="room_id" value={roomId} />}
      {/* ...rest of the existing form unchanged... */}
```

Leave all existing fields/imports as they are.

- [ ] **Step 2: Make room names links in `components/HierarchySidebar.tsx`**

Add `import Link from 'next/link'` at the top. Replace the room line:
```tsx
{f.rooms.map((r) => (
  <div key={r.id} className="ml-3 text-gray-600">{r.name}</div>
))}
```
with:
```tsx
{f.rooms.map((r) => (
  <Link
    key={r.id}
    href={`/projects/${projectId}/rooms/${r.id}`}
    className="ml-3 block text-gray-600 hover:text-black"
  >
    {r.name}
  </Link>
))}
```
Change nothing else (the add-room/floor/building forms stay).

- [ ] **Step 3: Verify + commit**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.
Run: `cd "<worktree>" && npx vitest run` → green (33/33).

```bash
git add components/NewTicketForm.tsx components/HierarchySidebar.tsx
git commit -m "feat(ui): NewTicketForm spatial defaults + room links in hierarchy"
```

---

### Task 2: Room detail page

**Files:**
- Create: `app/(app)/projects/[id]/rooms/[roomId]/page.tsx`

**Interfaces:** consumes `NewTicketForm` (with spatial defaults), `TicketList`, `TicketDrawer`, `PageHeader`, `Section`, `EmptyState`, badges.

- [ ] **Step 1: Create `app/(app)/projects/[id]/rooms/[roomId]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/EmptyState'
import { TicketList } from '@/components/TicketList'
import { TicketDrawer } from '@/components/TicketDrawer'
import { NewTicketForm } from '@/components/NewTicketForm'

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>
}) {
  const { id, roomId } = await params
  const supabase = await createClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, floor_id, floors(name, building_id, buildings(name, project_id))')
    .eq('id', roomId)
    .single()
  if (!room) notFound()
  type RoomCtx = {
    id: string; name: string; floor_id: string
    floors: { name: string; building_id: string; buildings: { name: string; project_id: string } | null } | null
  }
  const r = room as unknown as RoomCtx
  const floorName = r.floors?.name ?? ''
  const buildingName = r.floors?.buildings?.name ?? ''
  const buildingId = r.floors?.building_id

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, seq, type, discipline, title, status, priority, due_date, assignee:assignee_id(full_name), building:building_id(name), floor:floor_id(name), room:room_id(name)')
    .eq('room_id', roomId)
    .order('seq', { ascending: false })
  const all = (tickets as never[]) ?? []
  const tasks = all.filter((t: { type: string }) => t.type === 'task')
  const site = all.filter((t: { type: string }) => t.type === 'site_issue')

  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, status, category')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
  type Mat = { id: string; name: string; status: string; category: string }
  const mats = (materials as Mat[]) ?? []

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title={r.name}
        meta={
          <>
            {buildingName && <span>{buildingName}</span>}
            {floorName && <span>· {floorName}</span>}
          </>
        }
      />

      <Section title="New ticket in this room">
        <NewTicketForm projectId={id} buildingId={buildingId} floorId={r.floor_id} roomId={r.id} />
      </Section>

      <Section title={`Work · ${tasks.length}`}>
        <TicketList tickets={tasks as never} />
      </Section>

      <Section title={`Site issues · ${site.length}`}>
        <TicketList tickets={site as never} />
      </Section>

      <Section title={`Materials · ${mats.length}`}>
        {mats.length === 0 ? (
          <EmptyState title="No materials for this room" />
        ) : (
          <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
            {mats.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-2.5">
                <span className="text-ink">{m.name}</span>
                <span className="text-xs text-ink-muted">{m.category} · {m.status.replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <TicketDrawer />
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean. (If the `floors(...)`/`buildings(...)` nested embed types as arrays, adjust `RoomCtx` accordingly and keep the cast; report it.)
Run: `cd "<worktree>" && npx vitest run` → green (33/33).
Manual (user, auth-gated): clicking a room in the hierarchy opens `/projects/[id]/rooms/[roomId]`; header shows building · floor · room; Work/Site sections list that room's tickets and open the drawer; "New ticket in this room" creates a ticket that lands in that room (verify room association persists); Materials section lists the room's materials or empty state.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/projects/[id]/rooms/[roomId]/page.tsx"
git commit -m "feat(ui): room detail view — work/site/materials + room-scoped create"
```

---

## Self-Review notes
- **Spec coverage:** room reveals work/site/materials (§12); contextual create pre-associates the room via `createTicket`'s existing FormData handling (§11); hierarchy rooms are now links. Drawings omitted (no room FK) — noted.
- **Placeholder scan:** none. `<worktree>` = controller-supplied path. Step 2 embed-shape note has a concrete fallback.
- **Type consistency:** room tickets use the exact `TicketList` Row select (assignee/building/floor/room embeds); `NewTicketForm` new optional props are additive (existing prop-only call sites unaffected).
- **Constraint check:** no deps/schema; reuse `createTicket` (no action change); reuse TicketList/TicketDrawer/primitives; additive route + two small component edits.
- **Note:** `HierarchySidebar` still uses pre-token styling (deferred-polish backlog) — only the room-link is added here, not a full restyle.
