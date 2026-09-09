# Kanban View for Tickets — Design Spec

Date: 2026-09-09
Branch: `feat/kanban-view` (off `master`)
Status: awaiting review

## Goal

Add a Kanban board as a second presentation of the **existing** ticket system on
the project page, beside the current Table (list) view. Both views read the same
server-fetched tickets and share the same status/mutation/permission logic. This
is integration, not a new task system. No rebuild, no schema change.

## Existing system (verified)

- Domain term is **ticket**, `type: 'task' | 'site_issue'` (`lib/status.ts`).
- Tickets fetched server-side in `app/(app)/projects/[id]/page.tsx` via Supabase;
  no client data-fetching lib. Mutations = Server Actions + `revalidatePath`.
- "Table view" = `components/TicketList.tsx` (a `<ul>`); rows `<Link>` to the
  full detail **page** `/tickets/[id]`. **No drawer exists.**
- Status = Postgres enum + **per-type state machine** in `lib/status.ts`:
  - `task`: open ⇄ in_progress, both → closed, closed → open (resolved/verified unused).
  - `site_issue`: open → in_progress → resolved → verified → closed; **verified requires an after-photo** (`canTransition` gate).
- Status change = `changeStatus` action (`app/(app)/actions.ts`), validates via
  `canTransition`, updates, `revalidatePath('/tickets/${id}')`.
- Filters = `components/TicketFilters.tsx`: status + discipline only, via URL params.
- `tickets` columns include `assignee_id → profiles(full_name)`, `priority`,
  `due_date`, `discipline`, `seq`. **No `position`/order column.**
- No status colors, no DnD library, no view switcher, no app-level permissions
  (RLS = all authenticated CRUD; unenforced `role` enum exists).

## Decisions (confirmed with user)

1. Card click opens a **new right-side drawer** that reuses existing detail
   components; the board stays visible behind it.
2. Drag **respects the state machine**; illegal drops are rejected.
3. **No** intra-column reorder, **no** `position` migration; order by `seq`.
4. Board is **split by type** (Task | Site) — one pipeline shown at a time.
5. Assignee name via a `profiles` join in the board query.
6. DnD via **native HTML5** drag-and-drop — no new dependency.

## Architecture

```
projects/[id]/page.tsx  (server, existing — minimal edits)
  ├─ ViewSwitcher  → ?view=table|kanban   (table default)
  ├─ TicketFilters (existing; status select hidden when view=kanban)
  ├─ view=table  → TicketList (existing, UNTOUCHED)
  └─ view=kanban → KanbanBoard (new, 'use client')
                     ├─ type selector [Task | Site] → ?ktype=task|site_issue
                     ├─ Column per status (from lib/status.ts) — header "name · count"
                     │    └─ TicketCard (native draggable)
                     └─ TicketDrawer (new, 'use client') — opens on ?ticket=<id>
```

### Data flow / sync
- Server page fetches tickets once (adds `assignee:assignee_id(full_name)` to the
  select) and passes them to whichever view is active. Because both views consume
  the same server data and every mutation calls `revalidatePath` on the project
  path, a change in one view is reflected in the other after revalidation.
- `KanbanBoard` seeds local optimistic state (React 19 `useOptimistic`) from the
  server tickets so drags feel instant; server data remains the source of truth.

### View switcher
- New `components/ViewSwitcher.tsx` (`'use client'`): two segmented buttons that
  set `?view=` via the same `useSearchParams`/`router.replace` pattern as filters.
- Server page reads `searchParams.view` and renders Table or Kanban. Default table.

### Board & columns
- Columns derived from `lib/status.ts` per active `ktype` (no hardcoded list):
  - task → `[open, in_progress, closed]`
  - site_issue → `[open, in_progress, resolved, verified, closed]`
  - (Derivation helper: statuses reachable in that type's transition map, in a
    fixed display order defined once next to the state machine.)
- Board filters the passed tickets to the active type, groups by status.
- Empty columns remain visible ("No tickets") and still accept legal drops.
- Column header shows status label + count of currently displayed tickets.

### Card
- `components/TicketCard.tsx`: seq badge (`TASK-`/`SITE-`+seq), title, priority,
  discipline, assignee full_name, due_date. Compact, Notion-restrained.
- New `lib/ticket-colors.ts`: subtle status→Tailwind color map, mirroring the
  `HealthDot`/`lib/health.ts` pattern. Used for the column accent, not full cards.

### Drag & drop (native HTML5)
- On `dragstart`, compute legal targets = `allowedTransitions(type, status)`;
  mark only those columns as valid drop zones (visual highlight). Same-column and
  illegal columns do not accept the drop.
- On drop: optimistically move the card to the target status, then submit the
  existing `changeStatus` action.
- Server re-validates via `canTransition` (incl. verified-needs-photo). If it
  rejects (e.g. dragging a site_issue to verified without an after-photo), the
  optimistic move reverts and a short inline error is shown.
- **Edit to `changeStatus`**: also `revalidatePath('/projects/${project_id}')`
  (look up the ticket's `project_id`, or pass it in the form) so the board and
  table both refresh. Current behavior (validation, ticket-page revalidation)
  is unchanged.

### Drawer (reuses existing detail components)
- Opened by `?ticket=<id>` (a param, not navigation) so the board never unmounts
  and scroll position is preserved; closing clears the param.
- `components/TicketDrawer.tsx` (`'use client'`): right-side slide-in over a
  scrim; board visible behind. On open it calls one new **read-only** server
  action `getTicketDetail(id)` (ticket + attachments + comments, the same reads
  the detail page already does) and renders the **existing** `StatusControl`,
  photo, and `CommentThread` components — no duplicated detail logic.
- The full page `/tickets/[id]` stays for deep-links, hard navigation, and no-JS.
- Status is changeable inside the drawer via the existing `StatusControl`
  (keyboard-accessible alternative to drag → satisfies a11y requirement).

### Filters / search
- Reuse `TicketFilters`. Discipline applies to both views. The **status** select
  is hidden when `view=kanban` (columns already are status).
- No search/assignee/priority/tag/date filter exists to reuse; none added
  (out of scope).

### Permissions
- No app-level permission layer exists; board is editable for all authenticated
  users, matching the current app. `changeStatus` stays the single choke point if
  role enforcement is added later. If a future read-only role appears, disable
  `draggable` and drawer status controls behind that same check — not built now.

### Responsive
- Board is a horizontal flex/scroll container; each column has a min-width
  (~16rem). Many columns scroll horizontally rather than shrink. Drawer and
  existing responsive patterns unchanged.

## Files

New:
- `components/ViewSwitcher.tsx`
- `components/KanbanBoard.tsx`
- `components/TicketCard.tsx`
- `components/TicketDrawer.tsx`
- `lib/ticket-colors.ts`
- `lib/kanban-columns.ts` (derive ordered columns per type from the state machine)

Edited (minimal):
- `app/(app)/projects/[id]/page.tsx` — add ViewSwitcher, add `assignee` +
  `project_id` to the ticket select, branch table/kanban on `?view=`, pass
  `?ticket=`/`?ktype=` through.
- `app/(app)/actions.ts` — `changeStatus`: also revalidate the project path;
  add read-only `getTicketDetail` if used for the drawer.
- `components/TicketFilters.tsx` — hide the status select when `view=kanban`.

Untouched: `TicketList`, DB schema, `lib/status.ts` rules, existing detail page,
`NewTicketForm`, all drawing/media/material code.

## Out of scope (YAGNI)

- Intra-column reordering + `position` column/migration.
- New filter or search systems.
- A DnD library (dnd-kit etc.).
- Wiring the drawer into `TicketList` (table rows keep navigating to the page).
- Task creation from a column (existing `NewTicketForm` remains; can be added
  later to default status per column — flagged, not built).
- Role-based read-only mode (no permission layer exists yet).

## Testing

- Unit (vitest): `lib/kanban-columns.ts` returns correct ordered columns per type;
  a legal-target helper matches `allowedTransitions`.
- Manual: view switch table↔kanban (state preserved), open/close drawer (board
  position kept), change status in drawer reflects on board + table, drag legal
  move persists across refresh, illegal drag reverts with message, verified-photo
  gate rejection reverts, empty columns accept drops, discipline filter applies,
  horizontal scroll with many columns.
