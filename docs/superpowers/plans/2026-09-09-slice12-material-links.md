# Slice 12 — Material decision library uplift (relations + previews) — Implementation Plan

**Goal:** Make materials a real decision *library*: link a material to its spec **drawing** and to related **tickets** (two-way, both directions visible), keep the existing **room** relation, and render datasheet attachments with an inline **preview** (PDFs, not just a text link).

**Architecture (mirror what exists):** The repo has **no junction tables** — the ticket↔drawing "two-way" link is a single nullable FK (`tickets.drawing_id`) rendered from both sides by querying each way. Slice 12 mirrors that exactly:
- `materials.drawing_id` → the spec drawing (one drawing per material; a drawing can have many materials).
- `tickets.material_id` → the material a ticket concerns (one material per ticket; a material can have many tickets).
Links are set at creation (select in the material/ticket form), matching how `drawing_id` is set on a ticket today. Attachment preview reuses the existing `components/RevisionPreview.tsx` (extension-driven: pdf→iframe, image→img, else→download).

**Tech:** Next.js 15, React 19, Tailwind, Supabase. **No new deps. No junction tables. No M2M.**

## Global constraints
- Do NOT change material status logic (`lib/materials.ts`), the ticket state machine, `canTransition`, or any RLS. New FK columns are `on delete set null` (same as `drawing_id`).
- New form fields are **optional** and additive; existing create flows keep working with the field unset.
- `RevisionPreview` is reused as-is (props `{url, path}`) — no new preview component.
- Room relation already exists and is displayed; left unchanged (rooms have no standalone page).

---

### Task 1 — Migration + types

**Files:** create `supabase/migrations/0004_material_links.sql`; modify `lib/database.types.ts`.

- `0004_material_links.sql`:
  ```sql
  alter table materials add column drawing_id uuid references drawings(id) on delete set null;
  alter table tickets   add column material_id uuid references materials(id) on delete set null;
  ```
- `lib/database.types.ts`: add `drawing_id: string | null` to `materials` Row/Insert/Update (Insert/Update optional `?`); add `material_id: string | null` to `tickets` Row/Insert/Update (optional `?`).

Verify: `npx tsc --noEmit` clean.

### Task 2 — Create-time linking

**Files:** `components/NewMaterialForm.tsx`, `app/(app)/projects/[id]/materials/page.tsx`, `app/(app)/material-actions.ts`, `components/NewTicketForm.tsx`, `app/(app)/actions.ts`, `app/(app)/projects/[id]/work/page.tsx`, `app/(app)/projects/[id]/rooms/[roomId]/page.tsx`.

- `NewMaterialForm`: add optional prop `drawings: { id: string; label: string }[] = []`; when non-empty render `<select name="drawing_id" defaultValue=""><option value="">no drawing</option>…</select>`.
- materials `page.tsx`: fetch project drawings (`id, drawing_number, title`), map to `{id, label: number ? \`${number} — ${title}\` : title}`, pass to the form.
- `createMaterial`: insert `drawing_id: opt('drawing_id')`.
- `NewTicketForm`: add optional prop `materials: { id: string; label: string }[] = []`; when non-empty render `<select name="material_id" defaultValue=""><option value="">no material</option>…</select>` before submit (mirror the revision select).
- `createTicket`: insert `material_id: opt('material_id')`.
- work `page.tsx` + room `[roomId]` `page.tsx`: fetch project materials (`id, name`), pass `materials={…}` to `NewTicketForm`.

### Task 3 — Two-way display

**Files:** `app/(app)/materials/[id]/page.tsx`, `app/(app)/drawings/[id]/page.tsx`, `app/(app)/actions.ts` (getTicketDetail), `components/TicketDrawer.tsx`, `app/(app)/tickets/[id]/page.tsx`.

- **Material detail:** embed `drawing:drawing_id(id, drawing_number, title)` in the material query; show a "Linked drawing →" link (mirror ticket's linked-drawing line). Query `tickets` where `material_id = id` (`id, seq, type, title`); render a "Linked tickets · N" section opening each in the drawer via `?ticket=`; render `<TicketDrawer />` on the page (mirror `drawings/[id]/page.tsx`).
- **Drawing detail:** query `materials` where `drawing_id = id` (`id, name, category`); add a "Linked materials · N" `Section`, each row → `/materials/[id]` with `categoryLabel`.
- **getTicketDetail:** add `material_id, material:material_id(name)` to the select.
- **TicketDrawer + tickets/[id]:** when `material_id` set, show a "Linked material →" link to `/materials/[material_id]` (mirror the existing linked-drawing line).

### Task 4 — Datasheet preview

**Files:** `components/MaterialAttachments.tsx`, `app/(app)/materials/[id]/page.tsx`.

- Pass `path` (the `storage_path`) through to `MaterialAttachments` items (in addition to/instead of `ext`).
- Datasheets: replace the plain `<a>Datasheet (.ext)</a>` with `<RevisionPreview url path />` so PDFs render inline and other types fall back to a download link. Photos keep the thumbnail gallery.

---

## Verification
- `npx tsc --noEmit` clean; `npx vitest run` → 33/33 (no pure-logic change, so no new test — the links are FK plumbing + queries, preview is a reused component).
- Manual (auth-gated): create a material with a drawing → material shows Linked drawing; the drawing shows Linked materials. Create a ticket with a material → ticket drawer + detail show Linked material; the material shows Linked tickets, clickable into the drawer. Upload a PDF datasheet → renders inline.

## Deliberate simplifications (ponytail)
- **Single FK, not M2M** — one drawing/material per link, mirroring the only pattern in the repo. Junction tables deferred until a real many-to-many need appears.
- **Link at creation only** — no post-create link/unlink UI, exactly as `tickets.drawing_id` works today. Add an inline linker later if users need to re-link.
- **Room unchanged** — already a displayed relation; no room page to link to.
- **No new test** — no new pure logic; FK plumbing + reused preview covered by tsc + existing suite + manual.
