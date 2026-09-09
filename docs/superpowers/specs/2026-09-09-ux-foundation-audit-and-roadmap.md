# Archflow — UX/UI/Architecture Audit & Prioritized Roadmap

Date: 2026-09-09
Branch: `feat/ux-foundation` (off `master` @ 89ea6e0 — includes Kanban + Materials)
Status: awaiting approval (design tokens + roadmap)
Scope of this doc: audit + prioritized plan ONLY. No code until approved.

---

## 1. Audit — current state vs the 33 principles

Verified by reading routes, components, lib, Server Actions, RLS, styling.

### Stack (keep)
Next.js 15 (RSC + Server Actions), React 19, Supabase (`@supabase/ssr`), Tailwind, Vitest. No component/state/data-fetching library. Data flow: RSC read → Server Action → `revalidatePath`; URL params hold view/filter state. **This philosophy is preserved throughout the roadmap.**

### What already satisfies the principles
- **Domain model is strong and correct.** Project → Building → Floor → Room → Ticket → Drawing → Revision → Site → Material all exist with real relationships.
- **Domain logic is isolated and tested** (`lib/status.ts`, `health.ts`, `kanban-columns.ts`, `markers.ts`, `revision-status.ts`, `materials.ts`) — 6 test files, pure logic. Principle 28/29 already respected.
- **State machines enforced server-side** (`canTransition`, verified-needs-after-photo). Principle 8/14 already respected.
- **URL-param view/filter state** already the pattern (`TicketFilters`, `DrawingFilters`, `MaterialFilters`, `ViewSwitcher`).
- **Kanban ↔ Table** synchronized via project revalidation; a reusable drawer exists (`TicketDrawer`) — but Kanban-only so far.
- **Health is domain-driven** (`lib/health.ts` + `HealthDot`).

### Highest-impact inconsistencies (the gaps)
| # | Gap | Evidence | Principle |
|---|-----|----------|-----------|
| G1 | **No design system.** Empty Tailwind theme, bare `globals.css`, no tokens/type scale/spacing scale. | `tailwind.config.ts`, `app/globals.css` | 3 |
| G2 | **No UI primitives.** No Button/Input/Select/Badge/PageHeader/EmptyState/Drawer shell. Every screen hand-rolls inline Tailwind → drift. | all components | 3, 31 |
| G3 | **Weak app shell.** `app/(app)/layout.tsx` is a thin top bar (`Archflow \| Site Visit \| Sign out`). No workspace sidebar, no project context, not collapsible, hierarchy invisible globally. | `app/(app)/layout.tsx` | 4, 30 |
| G4 | **Status/priority/discipline render as raw text** almost everywhere (only Kanban column dots colored). No shared visual language for meaning. | `TicketList`, detail pages | 2, 6, 31 |
| G5 | **Drawer not unified.** Table (`TicketList`) still `<Link>`-navigates to `/tickets/[id]`; drawer only in Kanban. Two ticket-detail experiences. | `TicketList.tsx`, `tickets/[id]/page.tsx`, `TicketDrawer.tsx` | 7, 32 |
| G6 | **Duplicated filter systems.** `TicketFilters`/`DrawingFilters`/`MaterialFilters` repeat the same URL-param pattern; no shared filter primitive, no chips, no search, no clear-all. | 3 filter components | 10 |
| G7 | **No loading/empty/error states.** No `loading.tsx`/`error.tsx`; empty lists show "No X yet" one-liners. | route tree | 22, 23 |
| G8 | **Overview is not a command center.** Workspace overview = new-project form + project list w/ inline metadata string. Project overview = ticket list + filters + hierarchy sidebar. Neither answers "what needs my attention now?". | `app/(app)/page.tsx`, `projects/[id]/page.tsx` | 5, 20, 30 |
| G9 | **No "My Work", no global search, no command menu, no activity stream.** | absent | 17, 18, 19, 21 |
| G10 | **Permissions not enforced.** RLS = every authenticated user full CRUD (`*_all ... using(true)`); `role` enum (`staff\|admin`) unused. Frontend has no gating either. | `0001_init.sql` policies | 25, 26 |
| G11 | **Spatial hierarchy is decorative.** `HierarchySidebar` shows the tree on the project page but clicking a room does not reveal its operational context (work/drawings/issues/materials). | `HierarchySidebar.tsx` | 12, 30 |
| G12 | **Contextual creation weak.** Creating a ticket doesn't auto-associate spatial/drawing context from where you started. | `NewTicketForm.tsx` | 11 |

---

## 2. Design principles for the whole initiative
- **Smallest coherent change per slice.** Each slice builds, tests green, no regression, then stop for review.
- **Reuse over parallel systems.** New primitives replace ad-hoc markup incrementally; no rewrite.
- **Domain logic stays in `lib/`.** UI consumes rules; never re-implements or bypasses them.
- **Server-side is the security boundary** (RLS), never frontend-only.
- **Preserve the lean stack.** No Redux/Zustand/React Query/component library.
- **Every metadata element earns its place** (principle 31: high info value, low visual noise).

---

## 3. Prioritized roadmap (slices)

### P0 — Core UX consistency (the foundation everything reuses)
- **Slice 1 — Design tokens + app shell** *(this turn's proposal; detailed in §4)*. Tailwind theme tokens + `globals.css` variables (color/type/spacing/radius), a collapsible workspace sidebar shell with project context and hierarchy entry points, and the base primitives the shell needs (Button, IconButton, nav items). *Why: nothing else can be consistent until tokens + shell exist.*
- **Slice 2 — Core primitives.** `Badge`/`Chip` (status/priority/discipline/health/approval — driven by `lib/` mappings), `PageHeader`, `Input`/`Select`/`Field`, `EmptyState`, `Section`. Replace the most-repeated inline markup on 2–3 screens as proof. *Why: removes G4/G2 drift; every later slice consumes these.*
- **Slice 3 — Unify the ticket drawer.** Promote `TicketDrawer` to open from Table rows and anywhere else via `?ticket=`; make `TicketList` open the drawer instead of navigating; keep `/tickets/[id]` for deep-link/no-JS. De-duplicate detail reads (`getTicketDetail`). *Why: G5/G32 — one inspect-in-context pattern.*
- **Slice 4 — Table view uplift.** Compact, readable issue-tracker table (Ticket/Type/Status/Priority/Discipline/Location/Due/Updated) using the primitives; row click → drawer. Optional column show/hide via URL params. *Why: G4 + principle 9.*

### P1 — Daily workflow
- **Slice 5 — Shared filter + search primitive.** One `Filters` primitive with active-filter chips, clear-all, search box, URL persistence; adopt in Work (tickets) first, then drawings/materials. *Why: G6/principle 10.*
- **Slice 6 — Project overview command center.** "What needs my attention": work (open/overdue/critical/recent/mine), drawings (awaiting approval/recently revised), site (open/awaiting verification), materials (pending) — each a compact section linking into filtered views. *Why: G8/principle 5,20.*
- **Slice 7 — My Work.** Personal cross-project view (assigned/due today/overdue/recently updated). *Why: G9/principle 19.*
- **Slice 8 — Activity stream.** Lightweight per-project activity (status moves, revisions, verifications, material updates). Needs a small `activity` table or derivation. *Why: G9/principle 21.*

### P2 — AEC depth
- **Slice 9 — Spatial context is operational.** Clicking a room reveals its work/drawings/site issues/materials/activity; contextual "＋ New ticket/site issue" pre-associates the room. *Why: G11/G12/principle 12,11.*
- **Slice 10 — Drawing register + two-way ticket links.** Drawing page as a proper register (number/title/discipline/current rev/history/approval/linked tickets); Ticket ↔ Drawing both directions. *Why: principle 13.*
- **Slice 11 — Site issue evidence-first layout + PhotoMarker polish.** *Why: principle 14,15.*
- **Slice 12 — Material decision library uplift** (relations to rooms/drawings/tickets, previews). *Why: principle 16. (Coordinate — recently merged.)*

### P3 — Collaboration & security
- **Slice 13 — Permissions foundation (RLS).** Enforce `role` (admin/staff) + add client/read-only; RLS policies per action; a small `lib/permissions.ts` (tested) the UI consumes. *Why: G10/principle 25.*
- **Slice 14 — Client-facing separation** (selected projects/drawings/approvals/updates; internal hidden by default). *Why: principle 26.*
- **Slice 15 — Approvals surfacing + notifications.** *Why: principle 21,20.*

### P4 — Advanced
- **Slice 16 — Global command menu** (search + create + navigate). *Why: principle 18.*
- **Slice 17 — Cross-project / portfolio search + dashboards + reporting.** *Why: principle 17.*

---

## 4. Slice 1 detail — Design tokens + app shell (PROPOSAL, needs approval)

### 4a. Design tokens (define once, consume everywhere)
Delivered as CSS variables in `globals.css` + mapped into `tailwind.config.ts` `theme.extend` so utilities like `bg-surface`, `text-muted`, `border-subtle` work. **80–90% neutral, color only for meaning.**

**Neutral scale (the UI ground):**
- `--bg` app background (near-white, e.g. `#FBFBFA` — Notion-quiet, not pure white)
- `--surface` cards/panels (`#FFFFFF`)
- `--surface-hover` (`#F5F5F4`)
- `--border-subtle` (`#EAEAE8`), `--border` (`#DDDDDA`)
- `--text` (`#1A1A19`), `--text-muted` (`#6B6B68`), `--text-faint` (`#9A9A96`)
- `--focus` ring (`#3B82F6` at low emphasis)

**Meaningful accents (used ONLY for the mapped meaning, never as decoration):**
- **Status** (from `lib/status.ts`): open=slate, in_progress=blue, resolved=amber, verified=violet, closed=green. *(Extends existing `lib/ticket-colors.ts` — reuse it.)*
- **Priority**: low=slate, medium=neutral, high=amber, critical=red.
- **Discipline**: a muted, distinct hue per discipline (low-saturation, for a small dot/label — not full backgrounds).
- **Health** (from `lib/health.ts`): green/yellow/red (reuse `HealthDot`).
- **Approval/revision** (from `lib/revision-status.ts`): draft/under_review/approved/superseded.

Each accent exposed as a token pair `--<name>-fg` / `--<name>-bg-soft` so a Badge is a soft tint + readable text, never a loud block.

**Type scale (typography carries hierarchy):**
- Font: system stack now (`ui-sans-serif, …`); optionally wire Inter later (no dep — Google Fonts via next/font is allowed, decide at approval).
- `--text-2xl` page title, `--text-lg` section, `--text-sm` body/meta default, `--text-xs` labels. Weights limited to 400 / 500 / 600 (principle: avoid excessive weights).

**Spacing / radius / shadow:** an 8px-based spacing rhythm, `--radius` (6px) and `--radius-lg` (10px), one restrained shadow token (`--shadow-sm`). Avoid heavy cards/big shadows (principle 3).

**Dark mode:** tokens structured so a later dark theme only redefines variables. Not built in slice 1.

### 4b. App shell
Rebuild `app/(app)/layout.tsx` into a two-column workspace:
- **Collapsible left sidebar** (state remembered via `localStorage`, per principle 4). Sections:
  - **Workspace:** Overview, Projects, My Work *(My Work links exist even before Slice 7 builds the page — or deferred; decide at approval)*
  - **Current Project** (shown when a project is active, from the route): Overview, Work, Drawings, Site, Materials
  - **Project Structure:** Buildings / Floors / Rooms entry (reuses `HierarchySidebar` content)
  - **Management:** Reports, Activity *(links may be stubbed until their slices land)*
- **Active-location highlighting** so "Where am I?" is always answered (principle 30).
- **Top bar** slimmed: breadcrumb (Project → …), global search placeholder (wired in P1/P4), sign out.
- Content area uses the new tokens (bg/surface/spacing).
- **New primitives needed by the shell only:** `Button`, `IconButton`, `SidebarNavItem`, `Breadcrumb`. (The broader primitive set is Slice 2.)

### 4c. What Slice 1 does NOT touch
Ticket/drawing/material/site logic, state machines, RLS, existing page bodies (they inherit tokens via the shell but keep their markup until later slices), tests (no domain logic changes — so no new tests in slice 1; a `lib/` addition like a discipline-color map would get a small test).

### 4d. Verification for Slice 1
`npx tsc --noEmit` clean; `npx vitest run` still green; manual browser pass (sidebar collapse/expand + persistence, active highlighting, project context appears on a project route, no regression to existing pages). Note: browser verification is auth-gated — will need the user's logged-in check or a test session.

---

## 5. Open decisions for approval
1. **Design tokens** (§4a): approve the neutral palette + accent approach, or adjust specific values/hues.
2. **Font**: keep system stack, or wire Inter via `next/font` (no runtime dep).
3. **Sidebar nav items** (§4b): include stubbed links for not-yet-built pages (My Work, Reports, Activity) now, or only show links whose pages exist.
4. **Execution flow**: same subagent-driven slice-by-slice flow used for Kanban (implementer → task review → fixes → final review), one slice at a time with your approval between slices.
