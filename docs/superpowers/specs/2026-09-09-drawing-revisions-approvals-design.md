# Archflow — Slice 2: Drawing Revisions + Approvals

**Date:** 2026-09-09
**Slice:** A project drawing register where each drawing carries versioned revisions (R01→Rnn) that move through an internal reviewer approval status-machine; tickets can link to a specific revision.
**Context:** Builds on the MVP slice (tickets, hierarchy, site issues). Single firm, internal staff only. Reuses the storage + signed-URL pattern and the pure status-module pattern already in the codebase.

---

## 1. Goal & Scope

A firm should be able to:

- Register a drawing under a project (title, sheet number, optional building/floor/discipline).
- Upload revisions of that drawing; each gets an auto-incremented revision number displayed as `R01`, `R02`, …
- Move a revision through review: draft → under_review → approved / approved_with_comments / changes_requested / rejected.
- Have a newly-approved revision automatically supersede the drawing's previously-approved revision.
- Preview a revision inline (PDF/image) or download it (CAD/other).
- Link a ticket (e.g. a site issue) to a specific drawing revision, and see linked tickets from the drawing.
- See a per-project count of revisions awaiting approval on the dashboard.

### Non-goals (later slices)

Client/external approval (portal slice) · sequential multi-approver chains · CAD rendering/preview · drawing overlay/diff/compare · markups/pins on drawings · approval notifications · changes to the project health calculation.

---

## 2. Architecture Overview

Same stack as the MVP (Next.js App Router + Supabase). New concerns:

| Concern | Choice |
|---|---|
| New tables | `drawings`, `drawing_revisions` (+ two nullable columns on `tickets`) |
| New enum | `revision_status` |
| Storage | new private bucket `drawing-files` |
| Approval logic | pure module `lib/revision-status.ts` (transitions), tested with Vitest |
| Preview | native browser: PDF in `<iframe>`, images in `<img>`, everything else a download link |
| Migration | `supabase/migrations/0002_drawings.sql` |
| Types | hand-edit `lib/database.types.ts` to add the new tables/enum/columns |

---

## 3. Data Model

All new tables: `uuid` PK (`gen_random_uuid()`), `created_at timestamptz default now()`, RLS enabled (§6).

### 3.1 drawings — the register entry (logical document)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid NOT NULL | → projects(id) on delete cascade |
| building_id | uuid | → buildings(id) on delete set null |
| floor_id | uuid | → floors(id) on delete set null |
| discipline | discipline | nullable (reuses the MVP enum) |
| title | text NOT NULL | e.g. "Ground Floor Electrical Plan" |
| drawing_number | text | firm sheet no, e.g. "E-101"; nullable |
| created_by | uuid | → profiles(id) |
| created_at | timestamptz | |

### 3.2 drawing_revisions — one version of a drawing
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| drawing_id | uuid NOT NULL | → drawings(id) on delete cascade |
| revision_no | int NOT NULL | 1,2,3…; unique per drawing; displayed `R0n` |
| storage_path | text NOT NULL | path within `drawing-files` |
| status | revision_status | default `'draft'` |
| reviewer_id | uuid | → profiles(id) on delete set null; informational/assignment |
| notes | text | reviewer or uploader note; nullable |
| uploaded_by | uuid | → profiles(id) |
| decided_at | timestamptz | set when it reaches a decided status; nullable |
| created_at | timestamptz | |

- Unique constraint `(drawing_id, revision_no)`.
- `revision_no` for a new revision = `max(revision_no) for that drawing + 1`, computed in the upload server action. **ponytail:** app-level, race negligible at single-firm scale; the unique constraint is the backstop (action retries once on conflict).
- "Latest revision" = highest `revision_no`. "Current approved" = highest `revision_no` whose status ∈ {approved, approved_with_comments}. Both derived on read; not stored.

### 3.3 tickets — alter (link to a revision)
Add two nullable columns:
| column | type | notes |
|---|---|---|
| drawing_id | uuid | → drawings(id) on delete set null |
| drawing_revision_id | uuid | → drawing_revisions(id) on delete set null |

A ticket may reference a specific revision (e.g. "socket conflict on R03"). `drawing_id` is stored alongside for easy "tickets on this drawing" filtering without a join.

### 3.4 Enum
```
revision_status : draft, under_review, approved, approved_with_comments,
                  changes_requested, rejected, superseded
```

---

## 4. Approval Status Machine

Encoded in a pure `lib/revision-status.ts` (like `lib/status.ts`), enforced in the app layer, not the DB.

```
draft              → under_review
under_review       → approved | approved_with_comments | changes_requested | rejected
changes_requested  → under_review          (resubmit the same file)
approved           → superseded            (auto only; see below)
approved_with_comments → superseded        (auto only)
rejected           → (terminal)
superseded         → (terminal)
```

- The manual actions a reviewer takes: **submit** (draft→under_review), **approve**, **approve with comments**, **request changes**, **reject** (from under_review), and **resubmit** (changes_requested→under_review).
- `superseded` is never chosen from the UI — it is applied automatically: when a revision becomes `approved` or `approved_with_comments`, the approve action sets any *other* currently-approved revision of the same drawing to `superseded`.
- Reaching any of {approved, approved_with_comments, changes_requested, rejected, superseded} sets `decided_at = now()`.

`lib/revision-status.ts` exports:
- `type RevisionStatus`
- `allowedRevisionTransitions(status: RevisionStatus): RevisionStatus[]` — manual transitions only (never lists `superseded`).
- `isApproved(status): boolean` — true for approved | approved_with_comments (used by supersede + "current approved").
- `formatRevision(n: number): string` — `1 → "R01"`, `10 → "R10"`.

---

## 5. Storage

- New private bucket `drawing-files`. Object path: `{project_id}/{drawing_id}/{revision_id}.{ext}`.
- Policies: authenticated may read + insert (same shape as `ticket-media`).
- Signed URLs generated server-side (reuse the `signedUrl` server action pattern; a shared helper may take a bucket argument).
- Preview by extension: `pdf` → `<iframe src={signedUrl}>`; `png|jpg|jpeg|webp|gif` → `<img>`; anything else (`dwg|rvt|dxf|…`) → a "Download" link. **ponytail:** no PDF.js; native browser PDF viewer.

---

## 6. Access / RLS

- `drawings`, `drawing_revisions`: RLS enabled; policy `for all to authenticated using (true) with check (true)` (same as MVP tables).
- Storage bucket `drawing-files`: authenticated read + insert policies.
- `reviewer_id` is informational this slice (any authenticated staff can act); it enables a "my reviews" filter in a later slice without a migration.

---

## 7. Screens (Next.js App Router)

- **`/projects/[id]/drawings`** — drawing register for the project: table of drawings (drawing_number, title, discipline, latest revision `R0n` + its status). "New drawing" form (title, number, discipline, optional building/floor). Filter by discipline and by latest-status. A "Drawings" link is added to the project page header.
- **`/drawings/[id]`** — drawing detail:
  - Metadata (project link, number, title, discipline, location).
  - Revision history list: `R0n` · status · uploaded_by · date · reviewer, newest first.
  - "Upload revision" (file input → creates the next `drawing_revisions` row at `draft`).
  - Per-revision reviewer actions rendered from `allowedRevisionTransitions` (Submit / Approve / Approve w/ comments / Request changes / Reject / Resubmit), each a server action; approve triggers supersede.
  - Inline preview of a selected revision (§5).
  - "Linked tickets" — tickets whose `drawing_id` = this drawing.
- **Ticket integration:**
  - New-ticket form (`NewTicketForm`) gains an optional "Drawing revision" `<select>` listing the project's revisions as `"<drawing title> R0n"`; selecting sets `drawing_id` + `drawing_revision_id`.
  - Ticket detail shows the linked drawing revision (link to `/drawings/[id]`) when set.
- **Dashboard:** each project row gains a `pending approvals N` count = revisions with status `under_review` under that project.

---

## 8. Pure Logic Modules (tested)

- **`lib/revision-status.ts`** — `allowedRevisionTransitions`, `isApproved`, `formatRevision` (see §4).
- Tests `tests/revision-status.test.ts`: transition sets per status; `superseded`/`rejected` terminal; `formatRevision` padding; `isApproved` truth table.

---

## 9. Proposed File Layout

```
supabase/migrations/0002_drawings.sql        tables, enum, tickets alter, RLS, bucket+policies
lib/revision-status.ts                        pure status machine + formatRevision
lib/database.types.ts                         (edit) add drawings, drawing_revisions, enum, ticket cols
app/(app)/drawing-actions.ts                  server actions: createDrawing, uploadRevision,
                                              reviewRevision (submit/approve/…); shared signedUrl(bucket)
app/(app)/projects/[id]/drawings/page.tsx     drawing register
app/(app)/drawings/[id]/page.tsx              drawing detail
components/NewDrawingForm.tsx                  create-drawing form
components/DrawingList.tsx                     register table + filters
components/RevisionHistory.tsx                 revision rows + reviewer action buttons
components/RevisionPreview.tsx                 pdf/image/download by extension
components/UploadRevision.tsx                  client upload → storage + createRevision
components/DrawingRevisionSelect.tsx          optional select used in NewTicketForm
tests/revision-status.test.ts                 Vitest
```
Touched existing files: `app/(app)/actions.ts` (createTicket accepts drawing refs), `components/NewTicketForm.tsx`, `app/(app)/tickets/[id]/page.tsx`, `app/(app)/page.tsx` (dashboard count), `app/(app)/projects/[id]/page.tsx` (Drawings link), `lib/database.types.ts`.

---

## 10. Deliberate Simplifications

- **No stored "current revision" pointer** — latest and current-approved are derived on read.
- **No PDF.js** — native `<iframe>` for PDF, `<img>` for images, download link otherwise.
- **App-level revision numbering** with a unique-constraint backstop; no sequence/trigger.
- **No approval chain** — a single reviewer status-machine; `reviewer_id` is assignment-only.
- **Health calc unchanged** — pending approvals show as a dashboard count, not a health input, this slice.
- **RLS stays "any authenticated"** — client/role-gated access waits for the portal slice.
