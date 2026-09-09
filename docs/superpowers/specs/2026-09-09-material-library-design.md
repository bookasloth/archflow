# Archflow — Slice 3: Material Library

**Date:** 2026-09-09
**Slice:** A project-scoped material register — materials with spec fields, optional room link, photos/datasheets, and a proposed→approved/rejected status toggle.
**Context:** Builds on slices 1 (tickets/hierarchy) and 2 (drawings/approvals). Single firm, internal staff only. Reuses the established storage + signed-URL pattern, the register/detail screen shape, and the per-project dashboard-count pattern.

---

## 1. Goal & Scope

A firm should be able to, per project:

- Register a material with its spec fields (name, category, manufacturer, product code, finish, colour, size, cost, supplier, notes) and optionally pin it to a room.
- Attach photos and datasheets to a material.
- Move a material through a simple decision: proposed → approved / rejected (stamping who decided and when); reopen a decided material back to proposed.
- Browse a project's materials, filtered by category and status.
- See a per-project "material decisions pending" count on the dashboard.

### Non-goals (later slices)

Global/reusable catalog across projects · procurement/ordering · cost roll-ups & budgets · material comparison/side-by-side · versioning of materials · full field-edit workflow (this slice is create + status + attachments; no post-create field editing) · client-facing material approval (portal slice).

---

## 2. Architecture Overview

Same stack as slices 1–2 (Next.js App Router + Supabase).

| Concern | Choice |
|---|---|
| New tables | `materials`, `material_attachments` |
| New enums | `material_status`, `material_category`, `material_attachment_kind` |
| Storage | new private bucket `material-files` |
| Decision logic | pure module `lib/materials.ts` (status transitions + category label), tested |
| Migration | `supabase/migrations/0003_materials.sql` |
| Types | hand-edit `lib/database.types.ts` (new tables/enums) |

---

## 3. Data Model

All new tables: `uuid` PK (`gen_random_uuid()`), `created_at timestamptz default now()`, RLS enabled (§6).

### 3.1 materials
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid NOT NULL | → projects(id) on delete cascade |
| room_id | uuid | → rooms(id) on delete set null; optional spatial link |
| category | material_category | NOT NULL |
| name | text NOT NULL | e.g. "Italian Marble" |
| manufacturer | text | nullable |
| product_code | text | nullable |
| finish | text | nullable |
| color | text | nullable |
| size | text | e.g. "1200 × 600 mm"; nullable |
| cost | numeric(12,2) | nullable |
| supplier | text | nullable |
| notes | text | free text / application notes; nullable |
| status | material_status | default `'proposed'` |
| decided_at | timestamptz | set on approve/reject, cleared on reopen; nullable |
| decided_by | uuid | → profiles(id) on delete set null; nullable |
| created_by | uuid | → profiles(id) |
| created_at | timestamptz | |

Index `materials_project_idx on materials(project_id)`. Room integrity (room belongs to the same project) is checked in the app layer, not the DB (same convention as tickets/drawings).

### 3.2 material_attachments
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| material_id | uuid NOT NULL | → materials(id) on delete cascade |
| storage_path | text NOT NULL | path within `material-files` |
| kind | material_attachment_kind | default `'photo'` |
| uploaded_by | uuid | → profiles(id) |
| created_at | timestamptz | |

### 3.3 Enums
```
material_status          : proposed, approved, rejected
material_category        : flooring, wall_finish, ceiling, joinery, sanitary,
                           lighting, hardware, paint, glazing, landscape, other
material_attachment_kind : photo, datasheet
```

---

## 4. Decision Model (toggle, not a machine)

Encoded in pure `lib/materials.ts`, enforced in the app layer.

```
proposed  → approved | rejected
approved  → proposed         (reopen)
rejected  → proposed         (reopen)
```

- From `proposed`, staff choose **Approve** or **Reject** → sets `status`, `decided_at = now()`, `decided_by = current user`.
- From `approved`/`rejected`, staff choose **Reopen** → `status = proposed`, `decided_at = null`, `decided_by = null`.
- `lib/materials.ts` exports:
  - `type MaterialStatus = 'proposed' | 'approved' | 'rejected'`
  - `nextMaterialStatuses(status: MaterialStatus): MaterialStatus[]` — proposed→[approved, rejected]; approved→[proposed]; rejected→[proposed].
  - `categoryLabel(category: string): string` — humanizes an enum value (`wall_finish` → `"Wall finish"`): replace `_` with space, capitalize first letter.

The `setMaterialStatus` server action re-reads the material and applies the transition only if `nextMaterialStatuses(current).includes(to)`.

---

## 5. Storage

- New private bucket `material-files`. Object path: `{project_id}/{material_id}/{uuid}.{ext}`.
- Policies: authenticated read + insert (same shape as `ticket-media` / `drawing-files`).
- Signed URLs generated server-side. Photos (`png|jpg|jpeg|webp|gif`) render inline as `<img>`; datasheets (`pdf` and others) render as a download link (extension-based, same helper idea as drawings).

---

## 6. Access / RLS

- `materials`, `material_attachments`: RLS enabled; policy `for all to authenticated using (true) with check (true)` (same as existing tables).
- Storage bucket `material-files`: authenticated read + insert policies.

---

## 7. Screens (Next.js App Router)

- **`/projects/[id]/materials`** — material register: filterable list (by category and status), each row: name · manufacturer · `categoryLabel` · room name (if set) · status badge. "New material" form (name*, category, room `<select>` of the project's rooms, manufacturer, product_code, finish, color, size, cost, supplier, notes) with an explicit submit button. A "Materials" link is added to the project page header (next to "Drawings").
- **`/materials/[id]`** — material detail:
  - All fields (name, category label, manufacturer, code, finish, color, size, cost, supplier, notes, room, status badge, decided-by/at when decided).
  - Photo gallery (inline images) + datasheet download links.
  - "Add attachment": file input + a `photo`/`datasheet` kind selector → uploads to `material-files`, records a `material_attachments` row.
  - Status toggle: buttons rendered from `nextMaterialStatuses` (Approve / Reject / Reopen), each a server action.
  - Room link (to the project, since rooms have no standalone page) and back link to the register.
- **Dashboard:** each project row gains a `materials pending N` count = materials with status `proposed` under that project (mirrors the drawings pending-approvals count).

---

## 8. Pure Logic Modules (tested)

- **`lib/materials.ts`** — `nextMaterialStatuses`, `categoryLabel` (see §4).
- Tests `tests/materials.test.ts`: transition sets per status; `categoryLabel` humanization (`wall_finish`→"Wall finish", `other`→"Other").

---

## 9. Proposed File Layout

```
supabase/migrations/0003_materials.sql          tables, enums, RLS, bucket+policies
lib/materials.ts                                 pure status transitions + category label
lib/database.types.ts                            (edit) add materials, material_attachments, enums
app/(app)/material-actions.ts                    server actions: createMaterial, addMaterialAttachment,
                                                 setMaterialStatus; signedMaterialUrl
app/(app)/projects/[id]/materials/page.tsx       register + filters
app/(app)/materials/[id]/page.tsx                detail
components/NewMaterialForm.tsx                    create-material form (rooms passed in)
components/MaterialList.tsx                       register rows
components/MaterialFilters.tsx                    category + status filters (mirror DrawingFilters)
components/MaterialStatusControl.tsx             Approve/Reject/Reopen buttons
components/AddMaterialAttachment.tsx             client upload → storage + record row
components/MaterialAttachments.tsx               photo gallery + datasheet links
tests/materials.test.ts                          Vitest
```
Touched existing files: `app/(app)/page.tsx` (dashboard pending-materials count), `app/(app)/projects/[id]/page.tsx` (Materials link + fetch rooms for the form), `lib/database.types.ts`.

---

## 10. Deliberate Simplifications

- **Status is a 3-state toggle**, not a transition machine — Approve/Reject from proposed, Reopen back.
- **No global catalog** — materials are project-scoped; cross-project reuse waits.
- **Filterable list, not grouped sections** — category+status filters give the grouping, matching the drawings register.
- **No post-create field editing** this slice — create, decide, attach; editing fields lands later.
- **Room integrity checked in app**, not by DB constraints (same as tickets/drawings).
- **Cost is a bare `numeric`** with no currency/formatting logic — stored and shown as entered.
