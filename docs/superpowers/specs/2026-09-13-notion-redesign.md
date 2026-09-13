# Archflow — Notion-style Workspace Redesign (Phase 2 + 3 proposal)

Date: 2026-09-13
Base: `feat/ux-foundation` (stacks on slices 1–17; migrations 0004/0005 must be applied first)
Status: **awaiting approval** — no redesign code until the schema additions (§2) are approved.

## 0. Locked decisions (from discovery)
- **Reskin + selective expansion**, keep **AEC identity** (Drawings/Revisions/Site Issues/Materials/Building-Floor-Room stay — Notion *interaction patterns* applied to AEC concepts, not a generic PM rename).
- Expansions in scope: **Calendar**, **Timeline (schedule bars, no dependency graph)**, **lightweight block docs**, **subtasks + tags + favorites/recent**.
- Storage: **DB tables** for favorites/recent/tags. Fonts: **keep Plus Jakarta + Poppins**. **Light mode now**, dark deferred (tokens stay dark-ready).
- Primary accent: **`#FE5000`** (replaces `#E8590C`), centralized in tokens.

## 1. What stays UNCHANGED (hard constraints)
Routes and their behavior, Supabase/Next/Vercel stack, `@supabase/ssr` data flow (RSC read → Server Action → `revalidatePath`), URL-param view state, auth, the admin/staff RLS model from slice 13, the photo-marker Site Visit flow, all existing `lib/` domain logic and its tests. New columns are **additive and nullable**; no existing column changes type or drops.

---

## 2. Schema additions (APPROVAL GATE — functional changes)
Each mirrors existing conventions: additive, nullable FKs `on delete set null`/`cascade`, RLS `select/insert/update` for authenticated + **delete admin-only** (slice-13 pattern), storage untouched. One migration per concern.

| # | Migration | Change | Justifies |
|---|---|---|---|
| 0006 | `tags` | `tags(id, name, color)` + `ticket_tags(ticket_id, tag_id)` join | Tagging tickets; filter/group by tag |
| 0007 | `ticket_subtasks` | `tickets.parent_id uuid → tickets(id) on delete set null` | Subtasks = tickets with a parent |
| 0008 | `ticket_schedule` | `tickets.start_date date null` | Timeline duration bars (paired with existing `due_date`) |
| 0009 | `documents` | `documents(id, project_id null → projects, title, content jsonb, icon text null, created_by, created_at, updated_at)` | Block docs (workspace pages when `project_id` null; project notes otherwise). `content` = ordered block array as JSON — no block table needed for lightweight editing |
| 0010 | `favorites_recent` | `favorites(user_id, entity_type, entity_id, created_at, pk(user_id,entity_type,entity_id))` + `recently_viewed(user_id, entity_type, entity_id, viewed_at, pk(user_id,entity_type,entity_id))` | Pinned + recent nav; RLS scoped `user_id = auth.uid()` |

`entity_type` is an app-level enum-in-text (`project|ticket|drawing|material|document`) — no cross-table FK, consistent with the app-layer-integrity convention already used for spatial refs.

**Tags scope:** tickets first (join table). Drawings/materials tagging is a later add if wanted — the `tags` table is reusable.
**Docs:** `content` as JSON blocks keeps the editor lightweight (no per-block rows, no migration churn per block type). Renders server-side to HTML for read; edited client-side.

---

## 3. Design system (Phase 3)

### 3a. Tokens (extend the existing set in `app/globals.css` — do not fork it)
**Primary → `#FE5000`.** Recompute the ramp so hover/active stay accessible and `soft` reads as tint not fill:
```
--primary:        #FE5000;
--primary-hover:  #E84800;   /* ~6% darker */
--primary-active: #CC3F00;
--primary-fg:     #FFFFFF;   /* AA on primary for button labels */
--primary-soft:   rgba(254, 80, 0, 0.10);   /* ghost hover / selected tint */
--primary-muted:  rgba(254, 80, 0, 0.16);   /* borders on selected rows, focus ring accent */
```
Add generic **semantic** tokens the redesign needs (currently only domain accents exist):
```
--success / --warning / --danger / --info  (+ -soft pairs), mapped from existing health/status hues
```
Add **text aliases** so components can use role names without churn (map to existing ink scale):
`--text-primary → --ink`, `--text-secondary → --ink-muted`, `--text-muted → --ink-faint`. Keep `--bg/--surface/--surface-hover/--border-subtle/--border-line` as-is.
**Focus:** switch the focus ring to `--primary` at low emphasis for interactive elements (accessibility requirement: visible focus, AA contrast on our surfaces).

### 3b. Type scale (keep Jakarta headings / Poppins body)
`page-title` 20/24 semibold (Jakarta) · `section` 15/16 medium (Jakarta) · `body` 14 (Poppins) · `meta` 13 · `label` 12 · `caption` 11. **No giant headings** (principle). Weights 400/500/600 only.

### 3c. Spacing / radius / shadow
8px rhythm. `--radius` 6 / `--radius-lg` 10 (unchanged). Shadows: keep the single `--shadow-sm`; **separation via spacing + subtle borders, not shadow** (calm-surface principle). Add one `--shadow-pop` for overlays (popover/menu/drawer) only.

### 3d. Buttons (consolidate `Button.tsx` variants)
`primary` (solid `#FE5000`), `secondary` (surface + border), `ghost` (transparent, `primary-soft` hover), `destructive` (danger), `icon-only` (`IconButton`). One size scale (sm/md), compact — no oversized buttons.

---

## 4. Application shell (Phase 4)

### 4a. Sidebar (`Sidebar.tsx` upgrade, not rewrite)
Sections, top→bottom, compact typography, subtle separators, hover-reveal `…` actions:
- **Search** (opens ⌘K — reuse `CommandMenu`)
- **Workspace:** Home, My Work, Approvals
- **Favorites** (from `favorites`) — pinned projects/pages/views; empty until pinned
- **Recent** (from `recently_viewed`, capped ~8)
- **Projects** — expandable; each project expands to its sub-pages (Work, Board, Calendar, Timeline, Drawings, Site, Materials, Docs). Active-state + hover `…` (favorite, open).
- **Management:** Activity, Reports
- **Admin** (admins only): Users
Collapse/expand persists (existing `localStorage` key). Collapsed = icons only, no layout break.

### 4b. Top contextual header (per-context, not one giant header)
`Breadcrumb` (Workspace / Project / Page / Item) · context title · **view controls** (only on database views) · page actions / primary action · ⌘K trigger. Adapts by route; task/detail context shows the item breadcrumb.

### 4c. Responsive
- **Desktop:** sidebar + content + right side-peek drawer.
- **Tablet:** sidebar collapses to icons; drawer overlays.
- **Mobile:** sidebar → slide-over drawer (hamburger); content full-width; task drawer → **full-screen sheet**; **Site Visit Mode stays first-class mobile** (camera capture + photo markers). Bottom-safe primary action.

---

## 5. Project = workspace page (Phase 5)
Project header: title, description (inline-editable), status/owner/dates/members meta row. Then **tabbed views over the SAME ticket data** where applicable:
`Overview · Work(list) · Board · Calendar · Timeline · Drawings · Site · Materials · Docs · Activity`.
Work/Board/Calendar/Timeline are **four views of one dataset** (no duplicated data). Drawings/Site/Materials/Docs are their own entities. Tabs are URL-param (`?view=`), server-rendered, reuse the existing route.

## 6. View system (Phase 6)
One shared **ViewControls** bar (lightweight popovers, not permanent buttons): View selector · Filter (multi-condition builder) · Sort · Group · Properties (show/hide) · Search. Persist in URL params (extends today's pattern). 
- **Table/List:** inline edit, sort, group, hide/show props, row → drawer.
- **Board:** group by status/priority/assignee/tag; compact dense cards.
- **Calendar:** month/week over `start_date`..`due_date`; drag to reschedule (Server Action).
- **Timeline:** duration bars start→due; drag/resize to reschedule; **no dependency arrows** (per decision).
Filters/sort/group are pure logic in `lib/` (tested) consuming the row set — UI never re-implements rules.

## 7. Task/detail (Phase 7)
Keep the **side-peek drawer**; enrich with: properties (status/priority/assignee/dates/tags/parent), description, **subtasks**, attachments, comments, activity, related (linked drawing/material from slices 10/12). Full-page expand for deep work (`/tickets/[id]` stays as the expand target). Inline + popover editing; minimal modals.

## 8. Component architecture (Phase 8 polish threads through all)
**Upgrade** existing primitives to tokens; **add** the missing ones as shared, single-source components: `Popover, Tooltip, Modal, Drawer(generic), Tabs, Avatar, DatePicker, MultiSelect, Skeleton, Toast, ContextMenu, PropertyEditor, Table, Board, Calendar, Timeline, ViewControls, FilterBuilder`. Empty states (what/why/action), skeleton loaders (structure-preserving), understandable error states, focus/hover/selected/disabled across the board. No new heavy animation lib — CSS transitions + existing patterns.

---

## 9. Execution roadmap (re-sliced; each is shippable, tests green, then checkpoint)
- **R1 — Tokens + design-system foundation:** `#FE5000` ramp, semantic + text tokens, focus ring, Button/Input/Select consolidation, add Popover/Tooltip/Skeleton/Avatar/Toast primitives. No behavior change. *(no schema)*
- **R2 — Shell:** sidebar sections (Favorites/Recent placeholders wired in R6), contextual header + breadcrumbs, responsive drawer/mobile shell. Verify every route renders. *(no schema)*
- **R3 — Migrations 0006–0010** + type updates + tested `lib/` for filters/sort/group and doc-block model. *(schema — gated by §2 approval)*
- **R4 — ViewControls + Table/Board uplift:** multi-filter/sort/group/properties; board grouping; inline edit.
- **R5 — Calendar + Timeline views** (start_date-driven; drag-reschedule).
- **R6 — Favorites/Recent + tags + subtasks** surfaced in sidebar, detail drawer, and filters.
- **R7 — Docs:** lightweight block editor + doc pages (workspace + per-project), links to tasks/drawings.
- **R8 — Home + Project-overview recomposition** (modular sections, not KPI cards) + polish pass (empty/loading/error/a11y/responsive).

Each R: inspect → reuse-first → smallest change → implement → `tsc`+`vitest`+`next build` → fix regressions → checkpoint.

## 10. Open defaults (asserted unless you object)
- Tags apply to **tickets** first; table reusable for drawings/materials later.
- Subtask = ticket with `parent_id`; shown nested in the detail drawer + as a group in list.
- Favorites/recent keyed by `(user_id, entity_type, entity_id)`; recent capped at 8, upserted on view.
- Calendar/Timeline are **ticket** views (projects appear as their tickets' span); a project-level portfolio timeline is a later add.
