# Slice 4 — Table view uplift — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Replace the ticket `<ul>` with a compact, readable issue-tracker **table** (columns: Ticket · Status · Priority · Discipline · Assignee · Location · Due), rows opening the unified drawer (already wired via `?ticket=`). Add spatial **Location** using building/floor/room name joins.

**Architecture:** Extend the project-page ticket query with `building/floor/room` name embeds; widen the `Row` type; rewrite `TicketList` as a semantic `<table>` inside a horizontal-scroll container, reusing Slice-2 badges. Row-open stays the `?ticket=` mechanism from Slice 3.

**Tech Stack:** Next.js 15, React 19, Tailwind, Supabase. No new deps.

**Spec:** roadmap Slice 4. Base: `feat/ux-foundation` (stacked on Slice 3).

## Global Constraints
- No new deps, no schema changes. ("Updated" column omitted — no `updated_at` on `tickets`; a migration is out of scope. Column show/hide omitted — YAGNI.)
- Reuse Slice-2 badges (`StatusBadge`/`PriorityBadge`/`DisciplineBadge`) and tokens. No hardcoded hex.
- Row open uses `?ticket=<id>` (preserve params), same as Slice 3 — do not reintroduce navigation to `/tickets/[id]`.
- Query change is additive (nullable FK embeds); do not change filters, Server Actions, or the Kanban path.
- Table must be horizontally scrollable on narrow screens (`overflow-x-auto` wrapper); the page must not overflow horizontally.
- Keyboard-accessible row open (real `<button>` in the Ticket cell).

---

### Task 1: Location joins + table rewrite

**Files:**
- Modify: `app/(app)/projects/[id]/page.tsx` (ticket select + Row typing passed to TicketList)
- Modify: `components/TicketList.tsx` (rewrite as a table)

**Interfaces:** consumes Slice-2 badges + the `?ticket=` open mechanism; produces the new `Row` shape (adds `assignee`, `building`, `floor`, `room`).

- [ ] **Step 1: Extend the ticket query in `app/(app)/projects/[id]/page.tsx`**

Change the ticket `.select(...)` to add the spatial name embeds (keep the existing fields + the assignee embed from Slice 1):

```tsx
  let q = supabase
    .from('tickets')
    .select('id, seq, type, discipline, title, status, priority, due_date, assignee:assignee_id(full_name), building:building_id(name), floor:floor_id(name), room:room_id(name)')
    .eq('project_id', id)
    .order('seq', { ascending: false })
```

Leave the `if (sp.status && view === 'table')` / `if (sp.discipline)` filters and everything else unchanged. The results are still passed as `tickets={(tickets as never) ?? []}` to both views (the cast already absorbs the shape change; KanbanBoard ignores the extra fields).

- [ ] **Step 2: Rewrite `components/TicketList.tsx` as a table**

```tsx
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
```

- [ ] **Step 3: Verify**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.
Run: `cd "<worktree>" && npx vitest run` → green (33/33).
Manual (user, auth-gated): Table view shows the columns with badges; row click opens the drawer (no navigation); Location shows building/floor/room where set (else —); assignee name renders; table scrolls horizontally on narrow widths without the page overflowing; empty state unchanged; Kanban unaffected.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/projects/[id]/page.tsx" components/TicketList.tsx
git commit -m "feat(ui): table view uplift — columns + spatial location, row opens drawer"
```

---

## Self-Review notes
- **Spec coverage:** issue-tracker table w/ columns (T1); Location via joins (T1); row→drawer reuse (T1). Omitted with rationale: "Updated" (no column; migration out of scope), column show/hide (YAGNI).
- **Placeholder scan:** none. `<worktree>` = controller-supplied path.
- **Type consistency:** new `Row` adds `assignee`/`building`/`floor`/`room`; the page casts `as never` so no compile coupling; the embeds are nullable objects `{name}|null` matching `locationOf`. KanbanBoard reads only the fields it needs (extra fields ignored).
- **Constraint check:** additive query, no schema, no new deps, badges reused, drawer mechanism unchanged, horizontal scroll contained.
