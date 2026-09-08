# Archflow — MVP Slice Design

**Date:** 2026-09-08
**Slice:** Architecture-hierarchy ticket system + photo-based site issues with before/after resolution
**Context:** Internal tool for a single architecture firm. Known users, no billing, no multi-org.

---

## 1. Goal & Scope

Build the backbone of an architecture-specific project/issue tracker plus a mobile "Site Visit Mode" that turns a photo into a located, assignable, verifiable issue.

A firm should be able to, on day one:

- Create projects and (optionally) describe their spatial hierarchy — buildings, floors, rooms.
- Create tickets pinned to any level of that hierarchy (or just the project), tagged by discipline.
- On a phone at the site: take a photo, mark the exact problem spot on the image, fill a few fields, and submit an issue.
- Track that issue through resolution: attach a before photo, later an after photo, and mark it verified.
- See a project dashboard with counts and a health indicator.

Everything else in the original product vision is explicitly deferred (§9).

### Non-goals for this slice

Approvals/revision workflows, client portal, material library, dependency graph, timeline milestones, smart notifications, AI ticket creation, analytics/reports, contractor/client login, offline sync, native mobile app.

---

## 2. Architecture Overview

| Concern | Choice |
|---|---|
| Frontend | Next.js (App Router, TypeScript) + Tailwind CSS |
| Backend / DB | Supabase — Postgres, Auth, Storage, Row Level Security |
| Data access | `@supabase/ssr` (server + browser clients) |
| Media | Supabase Storage, private bucket, server-generated signed URLs |
| Mobile | Responsive web + PWA manifest (installable). Camera via `<input type="file" accept="image/*" capture="environment">` |
| Hosting | Vercel (app) + Supabase Cloud (DB/storage) |
| Tests | Vitest on pure logic modules |

Single-org model: one Supabase project = one firm. No tenant column.

---

## 3. Data Model (Postgres)

All tables use `uuid` primary keys (`gen_random_uuid()`), `created_at timestamptz default now()`. RLS enabled on every table (§5).

### 3.1 profiles
Mirrors `auth.users`; created automatically by trigger on user insert.

| column | type | notes |
|---|---|---|
| id | uuid PK | references `auth.users(id)` on delete cascade |
| full_name | text | from signup metadata, nullable |
| role | role_enum | default `'staff'`; present for future granular access, ungated now |
| created_at | timestamptz | |

### 3.2 projects
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| code | text | short project code, e.g. "VILLA-01"; nullable |
| status | project_status_enum | default `'active'` |
| client_name | text | free text (no client login this slice) |
| created_by | uuid | → profiles(id) |
| created_at | timestamptz | |

### 3.3 buildings
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid NOT NULL | → projects(id) on delete cascade |
| name | text NOT NULL | |

### 3.4 floors
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| building_id | uuid NOT NULL | → buildings(id) on delete cascade |
| name | text NOT NULL | e.g. "Ground Floor" |
| level_order | int | for sorting; default 0 |

### 3.5 rooms
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| floor_id | uuid NOT NULL | → floors(id) on delete cascade |
| name | text NOT NULL | e.g. "Kitchen" |

### 3.6 tickets
The core entity. Spatial refs are all **nullable** — a ticket needs only a project.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid NOT NULL | → projects(id) on delete cascade |
| building_id | uuid | → buildings(id) on delete set null |
| floor_id | uuid | → floors(id) on delete set null |
| room_id | uuid | → rooms(id) on delete set null |
| type | ticket_type_enum | `task` \| `site_issue` |
| discipline | discipline_enum | |
| title | text NOT NULL | |
| description | text | |
| status | ticket_status_enum | default `'open'` |
| priority | priority_enum | default `'medium'` |
| assignee_id | uuid | → profiles(id) on delete set null |
| reporter_id | uuid NOT NULL | → profiles(id) |
| due_date | date | nullable |
| created_at | timestamptz | |

A **human-readable ticket reference** (e.g. `SITE-142`, `TASK-031`) is derived for display from `type` + a per-type sequence. Implemented as a `bigint` identity column `seq` plus a computed display string; not a hierarchy path. (Kept simple: one global sequence per type.)

*Note:* consistency between spatial refs (e.g. `room_id` truly belongs under `building_id`) is enforced in the app layer when creating/editing, not by cross-table DB constraints. Acceptable for one-firm scale.

### 3.7 attachments
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| ticket_id | uuid NOT NULL | → tickets(id) on delete cascade |
| storage_path | text NOT NULL | path within `ticket-media` bucket |
| kind | attachment_kind_enum | `before` \| `after` \| `reference` |
| uploaded_by | uuid | → profiles(id) |
| created_at | timestamptz | |

### 3.8 issue_markers
Pins dropped on a photo.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| attachment_id | uuid NOT NULL | → attachments(id) on delete cascade |
| x | real NOT NULL | normalized 0–1, fraction of image width |
| y | real NOT NULL | normalized 0–1, fraction of image height |
| label | text | short note for the pin, nullable |

### 3.9 comments
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| ticket_id | uuid NOT NULL | → tickets(id) on delete cascade |
| author_id | uuid NOT NULL | → profiles(id) |
| body | text NOT NULL | |
| created_at | timestamptz | |

### 3.10 Enums

```
role_enum          : staff, admin            -- ungated this slice
project_status_enum: active, on_hold, completed, archived
ticket_type_enum   : task, site_issue
discipline_enum    : architectural, structural, electrical, plumbing,
                     fire_safety, interior, landscape, construction,
                     documentation, client_coordination
ticket_status_enum : open, in_progress, resolved, verified, closed
priority_enum      : low, medium, high, critical
attachment_kind_enum: before, after, reference
```

---

## 4. Status Model

One `ticket_status_enum` serves both ticket types; allowed transitions differ and are enforced in a pure `lib/status.ts` module (§7), not the DB.

**task:**
```
open ⇄ in_progress → closed
closed → open            (reopen)
```

**site_issue:**
```
open → in_progress → resolved → verified → closed
resolved → in_progress   (reopen — fix rejected)
verified → in_progress   (reopen — regression found)
```

`resolved` and `verified` are not valid states for a `task`; `verified` requires an `after` attachment to exist on the ticket (checked in app layer before allowing the transition).

---

## 5. Auth & Access Control

- **Auth:** Supabase email/password. No public signup UI. Users are invited via the Supabase dashboard (internal staff only). A DB trigger on `auth.users` insert creates the matching `profiles` row (`full_name` from user metadata, `role` default `staff`).
- **RLS:** enabled on all tables. Policy this slice: any authenticated user has full read/write.
  - `profiles`: authenticated users may `select` all rows; may `update` only their own row.
  - All other tables: `select`/`insert`/`update`/`delete` allowed when `auth.role() = 'authenticated'`.
- **Storage:** private bucket `ticket-media`. Policy: authenticated users may read and write objects in the bucket. App generates short-TTL signed URLs server-side for display. Object path convention: `{project_id}/{ticket_id}/{uuid}.{ext}`.
- The `role` column exists so contractor/client slices can tighten these policies without a schema migration.

---

## 6. Screens (Next.js App Router)

```
app/
  (auth)/login/page.tsx            login
  auth/callback/route.ts           Supabase auth callback
  (app)/layout.tsx                 authed shell + nav (redirects to /login if unauthenticated)
  (app)/page.tsx                   dashboard
  (app)/projects/[id]/page.tsx     project view
  (app)/tickets/[id]/page.tsx      ticket detail
  (app)/site/page.tsx              Site Visit Mode
```

**Dashboard `/`** — list of projects, each with: name/code, health dot (§7), counts (due today, overdue, open site issues). Global "New Project" action.

**Project `/projects/[id]`** — hierarchy sidebar (buildings → floors → rooms, with add controls); ticket list with filters (discipline, status, assignee); "New Ticket" (spatial fields optional). Selecting a hierarchy node filters the list to that node and its descendants.

**Ticket `/tickets/[id]`** — all fields editable; discipline/status/priority/assignee/due date; photo section with marker viewer; before │ after comparison for site issues; comment thread; status-change control that offers only valid next states.

**Site Visit Mode `/site`** — mobile-first flow: pick project → capture/select photo → tap image to drop pins (each with optional label) → quick fields (title, discipline, priority, optional spatial pins, assignee, due date) → submit. Creates a `site_issue` ticket + `before` attachment + `issue_markers`.

**PhotoMarker component** (reused in Site Mode and ticket detail): renders an image in a positioned container; in edit mode a tap records normalized `(x, y)` and adds a pin; pins render at `left: x*100%`, `top: y*100%`; view mode is read-only. Coordinate math lives in `lib/markers.ts`.

---

## 7. Pure Logic Modules (tested)

- **`lib/health.ts`** — `computeHealth(tickets, today) → 'green' | 'yellow' | 'red'`.
  - `overdue` = `due_date < today` AND status ∉ {closed, verified}
  - `critical_open` = `priority = critical` AND status ∉ {closed, verified, resolved}
  - `due_soon` = `due_date` within next 3 days AND status ∉ {closed, verified}
  - `open_site_issue` = `type = site_issue` AND status ∈ {open, in_progress}
  - **red** if `overdue > 0` OR `critical_open > 0`; else **yellow** if `due_soon > 0` OR `open_site_issue > 0`; else **green**.
- **`lib/status.ts`** — `allowedTransitions(type, status) → status[]`, and `canTransition(type, from, to, {hasAfterPhoto})`. Encodes §4, including the `verified` requires-after-photo rule.
- **`lib/markers.ts`** — `toNormalized(clickX, clickY, rect) → {x, y}` and `toPixels({x, y}, rect) → {left, top}`. Clamps to [0,1].

---

## 8. Proposed File Layout

```
app/…                              (routes above)
components/
  PhotoMarker.tsx
  HierarchySidebar.tsx
  TicketList.tsx  TicketFilters.tsx
  HealthDot.tsx
  BeforeAfter.tsx
lib/
  supabase/client.ts  supabase/server.ts
  health.ts  status.ts  markers.ts
  types.ts                         (generated Supabase types + view models)
supabase/
  migrations/0001_init.sql         (tables, enums, trigger, RLS, storage bucket+policies)
  seed.sql                         (a demo project + hierarchy + sample tickets)
tests/
  health.test.ts  status.test.ts  markers.test.ts
public/manifest.webmanifest        (PWA)
```

---

## 9. Deferred (each its own future spec → plan → build)

Approvals & drawing revisions · client portal · material library · automatic dependency tracking · architecture timeline/milestones · smart notifications · AI ticket creation · analytics & reports · contractor/client login & role-based RLS · offline capture/sync · native app.

---

## 10. Deliberate Simplifications

- **Health is computed on read**, never stored — no denormalization to keep in sync.
- **No role-based RLS yet** — one firm, all authenticated users are staff. `role` column reserved for later.
- **Spatial-ref integrity checked in app**, not by DB constraints — one-firm scale doesn't warrant cross-table triggers.
- **Comments kept minimal** — flat thread, no edit history, no mentions.
- **Ticket display reference** uses a simple per-type sequence, not a hierarchical path string.
