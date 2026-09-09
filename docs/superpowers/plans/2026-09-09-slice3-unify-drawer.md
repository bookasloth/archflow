# Slice 3 — Unify the ticket drawer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** The Table view opens the SAME reusable `TicketDrawer` as Kanban (via `?ticket=<id>`), instead of navigating away to `/tickets/[id]`. The drawer renders once at the project-page level so both views share it. `/tickets/[id]` stays for deep-links / no-JS.

**Architecture:** Move the `<TicketDrawer />` render from `KanbanBoard` up to the project page. Convert `TicketList` to a small client component whose rows set `?ticket=<id>` (preserving existing params) — the drawer already reads that param. No new detail experience; no data/query changes.

**Tech Stack:** Next.js 15, React 19, Tailwind. No new deps.

**Spec:** `docs/superpowers/specs/2026-09-09-ux-foundation-audit-and-roadmap.md` (P0 Slice 3). Base: `feat/ux-foundation` (stacked on Slice 2).

## Global Constraints
- No new deps, no schema/domain changes.
- Presentation/wiring only: do NOT change the ticket query, the `Row` prop shape, badges, or any Server Action.
- `TicketDrawer` component itself is unchanged. It must render exactly once (page level) — remove it from `KanbanBoard` so it isn't rendered twice.
- Keep `/tickets/[id]` page as-is (deep-link fallback). Detail-read de-duplication (`getTicketDetail`) is explicitly DEFERRED (internal cleanup, not user-facing).
- Row open must be keyboard-accessible (use a real `<button>`).

---

### Task 1: Move drawer to page level + Table rows open it

**Files:**
- Modify: `components/TicketList.tsx` (→ client; rows open `?ticket=`)
- Modify: `components/KanbanBoard.tsx` (remove the `TicketDrawer` import + render)
- Modify: `app/(app)/projects/[id]/page.tsx` (render `<TicketDrawer />` once)

**Interfaces:** consumes existing `TicketDrawer` (opens on `?ticket=<id>`), Slice-2 badges/EmptyState. No new exports.

- [ ] **Step 1: Convert `components/TicketList.tsx` to open the drawer**

Replace the file with:

```tsx
'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { StatusBadge, PriorityBadge, DisciplineBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { TicketStatus } from '@/lib/status'
import type { Priority } from '@/lib/health'
import type { Discipline } from '@/lib/labels'

type Row = {
  id: string
  seq: number
  type: string
  discipline: string
  title: string
  status: string
  priority: string
  due_date: string | null
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
    <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
      {tickets.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 p-2.5 text-sm hover:bg-surface-hover">
          <button
            onClick={() => open(t.id)}
            className="flex min-w-0 items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
          >
            <span className="font-mono text-xs text-ink-faint">
              {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
            </span>
            <span className="truncate text-ink">{t.title}</span>
          </button>
          <span className="flex shrink-0 items-center gap-2">
            <DisciplineBadge discipline={t.discipline as Discipline} />
            <PriorityBadge priority={t.priority as Priority} />
            <StatusBadge status={t.status as TicketStatus} />
          </span>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Remove the drawer render from `components/KanbanBoard.tsx`**

Delete the import line `import { TicketDrawer } from '@/components/TicketDrawer'` and delete the `<TicketDrawer />` line (currently just before the outer closing `</div>`). Change nothing else — the board still sets `?ticket=` on card click via its existing `setParam('ticket', id)`.

- [ ] **Step 3: Render `<TicketDrawer />` once in `app/(app)/projects/[id]/page.tsx`**

Add the import near the other component imports:
```tsx
import { TicketDrawer } from '@/components/TicketDrawer'
```
Render `<TicketDrawer />` inside the `flex-1` content column, immediately after the view branch (the `{view === 'kanban' ? ... : ...}` block), so it exists for BOTH views:
```tsx
        {view === 'kanban' ? (
          <KanbanBoard tickets={(tickets as never) ?? []} />
        ) : (
          <TicketList tickets={(tickets as never) ?? []} />
        )}
        <TicketDrawer />
```

- [ ] **Step 4: Verify**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.
Run: `cd "<worktree>" && npx vitest run` → green (33/33).
Manual (user, auth-gated): in Table view, clicking a row opens the drawer over the list (no navigation); the board still opens the drawer; closing returns to the same view/scroll; deep-link `?view=table&ticket=<id>` opens the drawer on load; drawer rendered once (no double overlay when on Kanban).

- [ ] **Step 5: Commit**

```bash
git add components/TicketList.tsx components/KanbanBoard.tsx "app/(app)/projects/[id]/page.tsx"
git commit -m "feat(ui): unify ticket drawer — Table rows open it, drawer at page level"
```

---

## Self-Review notes
- **Spec coverage:** Table opens same drawer (T1); drawer rendered once at page level for both views (T1); `/tickets/[id]` untouched (deep-link fallback). De-dup of reads deferred per constraints.
- **Placeholder scan:** none. `<worktree>` = the path the controller passes.
- **Regression watch:** the board no longer renders the drawer itself — it must move to the page in the same slice (Step 2 + Step 3 together), else Kanban loses the drawer. Both edits are in this one task.
- **Type consistency:** no new types; casts at call sites match the existing `Row` (string) → badge-type pattern from Slice 2.
