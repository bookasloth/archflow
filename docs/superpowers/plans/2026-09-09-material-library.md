# Material Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-scoped material register where materials carry spec fields, an optional room link, photos/datasheets, and a proposed→approved/rejected status toggle.

**Architecture:** Extends the Next.js App Router + Supabase app. New `materials` / `material_attachments` tables and three enums; a pure `lib/materials.ts` holds the status-toggle rules and category label; server actions do the writes; files live in a new private `material-files` bucket served via signed URLs. Reuses established patterns: register/detail screens, server-action forms with explicit submit buttons, client-upload → server-action-record with error guarding, `as never` enum casts, nested-embed casts through `unknown`, and the per-project dashboard-count pattern.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind 3.4, `@supabase/supabase-js` 2.x, `@supabase/ssr` 0.12.x, Vitest 2.x.

**Spec:** `docs/superpowers/specs/2026-09-09-material-library-design.md`

## Global Constraints

- **Direct Supabase connection** already in `.env.local`. No proxy.
- **TypeScript `strict`**, no `any` in `lib/`.
- **Enums (verbatim):** `material_status`(proposed, approved, rejected) · `material_category`(flooring, wall_finish, ceiling, joinery, sanitary, lighting, hardware, paint, glazing, landscape, other) · `material_attachment_kind`(photo, datasheet).
- **Storage bucket:** `material-files` (private). Object path: `{project_id}/{material_id}/{uuid}.{ext}`.
- **Server-action forms MUST have an explicit submit `<button>`.**
- **Client uploads MUST guard errors:** check the storage `.upload()` `{ error }` and bail before recording the row; wrap the handler so the busy flag always clears; surface failures to the user. (This was a fix in the prior slice — bake it in here.)
- **Enum-typed inserts/updates from strings** use `as never`.
- **Supabase nested embeds** type as `SelectQueryError` (empty `Relationships`); cast those results through `unknown`.
- **`database.types.ts` empties stay `{ [_ in never]: never }`** — never `Record<string, never>`.

---

### Task 1: Migration + generated types

**Files:**
- Create: `supabase/migrations/0003_materials.sql`
- Modify: `lib/database.types.ts`

**Interfaces:**
- Produces the `materials` / `material_attachments` tables, the three enums, RLS, and the `material-files` bucket; plus matching TypeScript types.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0003_materials.sql`:
```sql
create type material_status as enum ('proposed','approved','rejected');
create type material_category as enum
  ('flooring','wall_finish','ceiling','joinery','sanitary','lighting','hardware','paint','glazing','landscape','other');
create type material_attachment_kind as enum ('photo','datasheet');

create table materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  category material_category not null,
  name text not null,
  manufacturer text,
  product_code text,
  finish text,
  color text,
  size text,
  cost numeric(12,2),
  supplier text,
  notes text,
  status material_status not null default 'proposed',
  decided_at timestamptz,
  decided_by uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index materials_project_idx on materials(project_id);

create table material_attachments (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials(id) on delete cascade,
  storage_path text not null,
  kind material_attachment_kind not null default 'photo',
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table materials enable row level security;
alter table material_attachments enable row level security;
create policy materials_all on materials for all to authenticated using (true) with check (true);
create policy material_attachments_all on material_attachments for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('material-files','material-files', false)
  on conflict (id) do nothing;
create policy material_files_read on storage.objects for select to authenticated
  using (bucket_id = 'material-files');
create policy material_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'material-files');
```

- [ ] **Step 2: Apply it**

Supabase Studio → SQL Editor → paste all of `0003_materials.sql` → Run. Verify: `materials`, `material_attachments` tables exist; Storage shows a private `material-files` bucket.

- [ ] **Step 3: Add the types**

Edit `lib/database.types.ts`. Add near the other enum type aliases:
```ts
type MaterialStatus = 'proposed' | 'approved' | 'rejected'
type MaterialCategory =
  | 'flooring' | 'wall_finish' | 'ceiling' | 'joinery' | 'sanitary' | 'lighting'
  | 'hardware' | 'paint' | 'glazing' | 'landscape' | 'other'
type MaterialAttachmentKind = 'photo' | 'datasheet'
```
Add two tables inside `public.Tables`:
```ts
      materials: {
        Row: {
          id: string; project_id: string; room_id: string | null; category: MaterialCategory
          name: string; manufacturer: string | null; product_code: string | null
          finish: string | null; color: string | null; size: string | null
          cost: number | null; supplier: string | null; notes: string | null
          status: MaterialStatus; decided_at: string | null; decided_by: string | null
          created_by: string | null; created_at: string
        }
        Insert: {
          id?: string; project_id: string; room_id?: string | null; category: MaterialCategory
          name: string; manufacturer?: string | null; product_code?: string | null
          finish?: string | null; color?: string | null; size?: string | null
          cost?: number | null; supplier?: string | null; notes?: string | null
          status?: MaterialStatus; decided_at?: string | null; decided_by?: string | null
          created_by?: string | null; created_at?: string
        }
        Update: {
          id?: string; project_id?: string; room_id?: string | null; category?: MaterialCategory
          name?: string; manufacturer?: string | null; product_code?: string | null
          finish?: string | null; color?: string | null; size?: string | null
          cost?: number | null; supplier?: string | null; notes?: string | null
          status?: MaterialStatus; decided_at?: string | null; decided_by?: string | null
          created_by?: string | null; created_at?: string
        }
        Relationships: []
      }
      material_attachments: {
        Row: {
          id: string; material_id: string; storage_path: string
          kind: MaterialAttachmentKind; uploaded_by: string | null; created_at: string
        }
        Insert: {
          id?: string; material_id: string; storage_path: string
          kind?: MaterialAttachmentKind; uploaded_by?: string | null; created_at?: string
        }
        Update: {
          id?: string; material_id?: string; storage_path?: string
          kind?: MaterialAttachmentKind; uploaded_by?: string | null; created_at?: string
        }
        Relationships: []
      }
```
Add to `public.Enums`:
```ts
      material_status: MaterialStatus
      material_category: MaterialCategory
      material_attachment_kind: MaterialAttachmentKind
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` → Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_materials.sql lib/database.types.ts
git commit -m "feat(db): materials + attachments schema, enums, material-files bucket"
```

---

### Task 2: Material status logic (pure, TDD)

**Files:**
- Create: `lib/materials.ts`
- Test: `tests/materials.test.ts`

**Interfaces:**
- Produces:
  - `type MaterialStatus = 'proposed' | 'approved' | 'rejected'`
  - `nextMaterialStatuses(status: MaterialStatus): MaterialStatus[]` — proposed→[approved, rejected]; approved→[proposed]; rejected→[proposed].
  - `categoryLabel(category: string): string` — `wall_finish`→"Wall finish", `other`→"Other".

- [ ] **Step 1: Write the failing test**

Create `tests/materials.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { nextMaterialStatuses, categoryLabel } from '@/lib/materials'

describe('nextMaterialStatuses', () => {
  it('proposed can be approved or rejected', () => {
    expect(nextMaterialStatuses('proposed').sort()).toEqual(['approved', 'rejected'])
  })
  it('approved can only be reopened', () => {
    expect(nextMaterialStatuses('approved')).toEqual(['proposed'])
  })
  it('rejected can only be reopened', () => {
    expect(nextMaterialStatuses('rejected')).toEqual(['proposed'])
  })
})

describe('categoryLabel', () => {
  it('humanizes an underscored enum value', () => {
    expect(categoryLabel('wall_finish')).toBe('Wall finish')
  })
  it('capitalizes a single-word value', () => {
    expect(categoryLabel('other')).toBe('Other')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- materials`
Expected: FAIL — cannot resolve `@/lib/materials`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/materials.ts`:
```ts
export type MaterialStatus = 'proposed' | 'approved' | 'rejected'

const TRANSITIONS: Record<MaterialStatus, MaterialStatus[]> = {
  proposed: ['approved', 'rejected'],
  approved: ['proposed'],
  rejected: ['proposed'],
}

export function nextMaterialStatuses(status: MaterialStatus): MaterialStatus[] {
  return TRANSITIONS[status]
}

export function categoryLabel(category: string): string {
  const spaced = category.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- materials` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/materials.ts tests/materials.test.ts
git commit -m "feat(logic): material status transitions + category label"
```

---

### Task 3: Material server actions

**Files:**
- Create: `app/(app)/material-actions.ts`

**Interfaces:**
- Consumes: `nextMaterialStatuses`, `type MaterialStatus` from `@/lib/materials`; server `createClient`.
- Produces server actions:
  - `createMaterial(formData: FormData)` — inserts a `materials` row; `revalidatePath('/projects/'+project_id+'/materials')`.
  - `addMaterialAttachment(input: { materialId: string; projectId: string; storagePath: string; kind: 'photo' | 'datasheet' }): Promise<void>`.
  - `setMaterialStatus(formData: FormData)` — validates via `nextMaterialStatuses`; sets `decided_at`/`decided_by` on approve/reject, clears them on reopen.
  - `signedMaterialUrl(path: string): Promise<string>`.

- [ ] **Step 1: Write the actions**

Create `app/(app)/material-actions.ts`:
```ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { nextMaterialStatuses, type MaterialStatus } from '@/lib/materials'

export async function createMaterial(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const projectId = String(formData.get('project_id'))
  if (!name || !projectId) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const opt = (k: string) => { const v = String(formData.get(k) ?? ''); return v || null }
  const costRaw = String(formData.get('cost') ?? '').trim()
  await supabase.from('materials').insert({
    project_id: projectId,
    room_id: opt('room_id'),
    category: String(formData.get('category')) as never,
    name,
    manufacturer: opt('manufacturer'),
    product_code: opt('product_code'),
    finish: opt('finish'),
    color: opt('color'),
    size: opt('size'),
    cost: costRaw ? Number(costRaw) : null,
    supplier: opt('supplier'),
    notes: opt('notes'),
    created_by: user!.id,
  })
  revalidatePath(`/projects/${projectId}/materials`)
}

export async function addMaterialAttachment(input: {
  materialId: string; projectId: string; storagePath: string; kind: 'photo' | 'datasheet'
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('material_attachments').insert({
    material_id: input.materialId,
    storage_path: input.storagePath,
    kind: input.kind,
    uploaded_by: user!.id,
  })
  revalidatePath(`/materials/${input.materialId}`)
}

export async function setMaterialStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const id = String(formData.get('material_id'))
  const to = String(formData.get('to')) as MaterialStatus
  const { data: m } = await supabase.from('materials').select('status').eq('id', id).single()
  if (!m) return
  if (!nextMaterialStatuses(m.status as MaterialStatus).includes(to)) return
  const decided = to === 'approved' || to === 'rejected'
  await supabase.from('materials').update({
    status: to as never,
    decided_at: decided ? new Date().toISOString() : null,
    decided_by: decided ? user!.id : null,
  }).eq('id', id)
  revalidatePath(`/materials/${id}`)
}

export async function signedMaterialUrl(path: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from('material-files').createSignedUrl(path, 3600)
  return data?.signedUrl ?? ''
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/material-actions.ts"
git commit -m "feat(materials): server actions for create/attach/status + signed URLs"
```

---

### Task 4: Material register page

**Files:**
- Create: `app/(app)/projects/[id]/materials/page.tsx`, `components/NewMaterialForm.tsx`, `components/MaterialList.tsx`, `components/MaterialFilters.tsx`
- Modify: `app/(app)/projects/[id]/page.tsx` (add a "Materials" link next to "Drawings")

**Interfaces:**
- Consumes: `createMaterial` from `@/app/(app)/material-actions`; `categoryLabel` from `@/lib/materials`; server `createClient`.
- Produces: `type RoomOption = { id: string; name: string }` (defined in `NewMaterialForm.tsx`, re-used by the page).

- [ ] **Step 1: MaterialFilters (mirror DrawingFilters)**

Create `components/MaterialFilters.tsx`:
```tsx
'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const STATUS = ['', 'proposed', 'approved', 'rejected']
const CATEGORY = ['', 'flooring', 'wall_finish', 'ceiling', 'joinery', 'sanitary', 'lighting',
  'hardware', 'paint', 'glazing', 'landscape', 'other']

export function MaterialFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  function set(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.replace(`${pathname}?${p.toString()}`)
  }
  return (
    <div className="flex gap-2 text-sm">
      <select className="rounded border p-1" defaultValue={params.get('status') ?? ''}
        onChange={(e) => set('status', e.target.value)}>
        {STATUS.map((s) => <option key={s} value={s}>{s || 'any status'}</option>)}
      </select>
      <select className="rounded border p-1" defaultValue={params.get('category') ?? ''}
        onChange={(e) => set('category', e.target.value)}>
        {CATEGORY.map((c) => <option key={c} value={c}>{c ? c.replace(/_/g, ' ') : 'any category'}</option>)}
      </select>
    </div>
  )
}
```

- [ ] **Step 2: NewMaterialForm**

Create `components/NewMaterialForm.tsx`:
```tsx
'use client'
import { createMaterial } from '@/app/(app)/material-actions'

export type RoomOption = { id: string; name: string }

const CATEGORY = ['flooring', 'wall_finish', 'ceiling', 'joinery', 'sanitary', 'lighting',
  'hardware', 'paint', 'glazing', 'landscape', 'other']

export function NewMaterialForm({ projectId, rooms }: { projectId: string; rooms: RoomOption[] }) {
  return (
    <form action={createMaterial} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="project_id" value={projectId} />
      <input name="name" placeholder="Material name" required className="rounded border p-1" />
      <select name="category" className="rounded border p-1">
        {CATEGORY.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
      </select>
      <select name="room_id" className="rounded border p-1" defaultValue="">
        <option value="">no room</option>
        {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      <input name="manufacturer" placeholder="Manufacturer" className="rounded border p-1" />
      <input name="product_code" placeholder="Code" className="rounded border p-1" />
      <input name="finish" placeholder="Finish" className="rounded border p-1" />
      <input name="color" placeholder="Colour" className="rounded border p-1" />
      <input name="size" placeholder="Size" className="rounded border p-1" />
      <input name="cost" type="number" step="0.01" placeholder="Cost" className="w-24 rounded border p-1" />
      <input name="supplier" placeholder="Supplier" className="rounded border p-1" />
      <input name="notes" placeholder="Notes" className="rounded border p-1" />
      <button type="submit" className="rounded bg-black px-3 text-white">Add material</button>
    </form>
  )
}
```

- [ ] **Step 3: MaterialList**

Create `components/MaterialList.tsx`:
```tsx
import Link from 'next/link'
import { categoryLabel } from '@/lib/materials'

type Row = {
  id: string; name: string; manufacturer: string | null; category: string
  status: string; room: string | null
}

export function MaterialList({ materials }: { materials: Row[] }) {
  if (materials.length === 0) return <p className="text-sm text-gray-500">No materials yet.</p>
  return (
    <ul className="divide-y rounded border">
      {materials.map((m) => (
        <li key={m.id} className="flex items-center justify-between p-2 text-sm">
          <Link href={`/materials/${m.id}`} className="flex items-center gap-2">
            <span>{m.name}</span>
            {m.manufacturer && <span className="text-xs text-gray-400">{m.manufacturer}</span>}
          </Link>
          <span className="flex gap-2 text-xs text-gray-500">
            <span>{categoryLabel(m.category)}</span>
            {m.room && <span>{m.room}</span>}
            <span className="rounded bg-gray-100 px-2 py-0.5">{m.status}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Register page**

Create `app/(app)/projects/[id]/materials/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewMaterialForm, type RoomOption } from '@/components/NewMaterialForm'
import { MaterialList } from '@/components/MaterialList'
import { MaterialFilters } from '@/components/MaterialFilters'

type MaterialRow = {
  id: string; name: string; manufacturer: string | null; category: string
  status: string; rooms: { name: string } | null
}
type BuildingTree = { floors: { rooms: { id: string; name: string }[] }[] }

export default async function MaterialsPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string; category?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('name').eq('id', id).single()

  const { data: buildingTree } = await supabase
    .from('buildings')
    .select('floors(rooms(id, name))')
    .eq('project_id', id)
  const rooms: RoomOption[] = ((buildingTree as unknown as BuildingTree[]) ?? [])
    .flatMap((b) => b.floors ?? [])
    .flatMap((f) => f.rooms ?? [])

  let q = supabase
    .from('materials')
    .select('id, name, manufacturer, category, status, rooms(name)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
  if (sp.status) q = q.eq('status', sp.status as never)
  if (sp.category) q = q.eq('category', sp.category as never)
  const { data: rows } = await q

  const materials = ((rows as unknown as MaterialRow[]) ?? []).map((m) => ({
    id: m.id, name: m.name, manufacturer: m.manufacturer, category: m.category,
    status: m.status, room: m.rooms?.name ?? null,
  }))

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{project?.name} — Materials</h1>
        <Link href={`/projects/${id}`} className="text-sm text-gray-500">← project</Link>
      </div>
      <NewMaterialForm projectId={id} rooms={rooms} />
      <MaterialFilters />
      <MaterialList materials={materials} />
    </main>
  )
}
```

- [ ] **Step 5: Link from the project page**

Modify `app/(app)/projects/[id]/page.tsx`: in the heading `<div className="flex items-center gap-3">` that already holds the project name and the `Drawings →` link, add a Materials link after the Drawings link:
```tsx
<Link href={`/projects/${id}/materials`} className="text-sm text-gray-500">Materials →</Link>
```
Make ONLY this addition; leave the rest of the file unchanged.

- [ ] **Step 6: Verify**

`npm run dev`: open a project → "Materials →" → add a material (name + category + optional room + fields) → it appears with its category label + status "proposed". Filters by category/status narrow the list. `npx tsc --noEmit` passes.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/projects/[id]/materials" components/NewMaterialForm.tsx components/MaterialList.tsx components/MaterialFilters.tsx "app/(app)/projects/[id]/page.tsx"
git commit -m "feat(materials): project material register + create + filters"
```

---

### Task 5: Material detail — fields, attachments, status toggle

**Files:**
- Create: `app/(app)/materials/[id]/page.tsx`, `components/MaterialStatusControl.tsx`, `components/MaterialAttachments.tsx`, `components/AddMaterialAttachment.tsx`

**Interfaces:**
- Consumes: `setMaterialStatus`, `addMaterialAttachment`, `signedMaterialUrl` from `@/app/(app)/material-actions`; `nextMaterialStatuses`, `categoryLabel` from `@/lib/materials`; browser `createClient`.

- [ ] **Step 1: MaterialStatusControl (server component)**

Create `components/MaterialStatusControl.tsx`:
```tsx
import { nextMaterialStatuses, type MaterialStatus } from '@/lib/materials'
import { setMaterialStatus } from '@/app/(app)/material-actions'

const LABEL: Record<MaterialStatus, string> = {
  approved: 'Approve',
  rejected: 'Reject',
  proposed: 'Reopen',
}

export function MaterialStatusControl({ id, status }: { id: string; status: MaterialStatus }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded bg-gray-100 px-2 py-1">{status}</span>
      {nextMaterialStatuses(status).map((to) => (
        <form key={to} action={setMaterialStatus}>
          <input type="hidden" name="material_id" value={id} />
          <input type="hidden" name="to" value={to} />
          <button type="submit" className="rounded border px-2 py-1">{LABEL[to]}</button>
        </form>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: MaterialAttachments (photos + datasheets)**

Create `components/MaterialAttachments.tsx`:
```tsx
type Att = { id: string; url: string; kind: string; ext: string }

export function MaterialAttachments({ attachments }: { attachments: Att[] }) {
  const photos = attachments.filter((a) => a.kind === 'photo')
  const datasheets = attachments.filter((a) => a.kind === 'datasheet')
  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" className="h-32 rounded border" />
          ))}
        </div>
      )}
      {datasheets.length > 0 && (
        <ul className="text-sm">
          {datasheets.map((d) => (
            <li key={d.id}>
              <a href={d.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                Datasheet (.{d.ext})
              </a>
            </li>
          ))}
        </ul>
      )}
      {attachments.length === 0 && <p className="text-sm text-gray-400">No photos or datasheets.</p>}
    </div>
  )
}
```

- [ ] **Step 3: AddMaterialAttachment (client, with error guarding)**

Create `components/AddMaterialAttachment.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addMaterialAttachment } from '@/app/(app)/material-actions'

export function AddMaterialAttachment({ materialId, projectId }: { materialId: string; projectId: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'photo' | 'datasheet'>('photo')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop() || 'bin'
      const path = `${projectId}/${materialId}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await createClient().storage.from('material-files').upload(path, file)
      if (upErr) {
        setError(upErr.message)
        return
      }
      await addMaterialAttachment({ materialId, projectId, storagePath: path, kind })
      setFile(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as 'photo' | 'datasheet')}
          className="rounded border p-1 text-sm">
          <option value="photo">photo</option>
          <option value="datasheet">datasheet</option>
        </select>
        <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button disabled={!file || busy} onClick={submit}
          className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50">
          {busy ? 'Uploading…' : 'Add'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Material detail page**

Create `app/(app)/materials/[id]/page.tsx`:
```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signedMaterialUrl } from '@/app/(app)/material-actions'
import { categoryLabel, type MaterialStatus } from '@/lib/materials'
import { MaterialStatusControl } from '@/components/MaterialStatusControl'
import { MaterialAttachments } from '@/components/MaterialAttachments'
import { AddMaterialAttachment } from '@/components/AddMaterialAttachment'

type MaterialRow = {
  id: string; project_id: string; category: string; name: string; manufacturer: string | null
  product_code: string | null; finish: string | null; color: string | null; size: string | null
  cost: number | null; supplier: string | null; notes: string | null; status: MaterialStatus
  rooms: { name: string } | null
}
type AttRow = { id: string; storage_path: string; kind: string }

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: m } = await supabase
    .from('materials')
    .select('id, project_id, category, name, manufacturer, product_code, finish, color, size, cost, supplier, notes, status, rooms(name)')
    .eq('id', id)
    .single()
  if (!m) notFound()
  const mat = m as unknown as MaterialRow

  const { data: attRows } = await supabase
    .from('material_attachments')
    .select('id, storage_path, kind')
    .eq('material_id', id)
    .order('created_at')
  const attachments = await Promise.all(
    ((attRows as unknown as AttRow[]) ?? []).map(async (a) => ({
      id: a.id, kind: a.kind, ext: (a.storage_path.split('.').pop() || '').toLowerCase(),
      url: await signedMaterialUrl(a.storage_path),
    })),
  )

  const fields: [string, string | number | null][] = [
    ['Manufacturer', mat.manufacturer], ['Code', mat.product_code], ['Finish', mat.finish],
    ['Colour', mat.color], ['Size', mat.size], ['Cost', mat.cost], ['Supplier', mat.supplier],
    ['Room', mat.rooms?.name ?? null], ['Notes', mat.notes],
  ]

  return (
    <main className="max-w-3xl space-y-5">
      <div>
        <Link href={`/projects/${mat.project_id}/materials`} className="text-sm text-gray-500">← materials</Link>
        <h1 className="text-xl font-semibold">{mat.name}</h1>
        <div className="text-xs text-gray-500">{categoryLabel(mat.category)}</div>
      </div>

      <MaterialStatusControl id={mat.id} status={mat.status} />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {fields.filter(([, v]) => v !== null && v !== '').map(([k, v]) => (
          <div key={k} className="flex justify-between border-b py-1">
            <dt className="text-gray-500">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-2">
        <h4 className="text-sm font-medium">Photos &amp; datasheets</h4>
        <MaterialAttachments attachments={attachments} />
        <AddMaterialAttachment materialId={mat.id} projectId={mat.project_id} />
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Verify the loop**

`npm run dev`: open a material → fields render; add a photo (image) → it shows in the gallery; add a datasheet (PDF) → download link appears. Click **Approve** → status becomes `approved`, control now offers **Reopen**; click **Reopen** → back to `proposed` with **Approve**/**Reject**. `npx tsc --noEmit` passes.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/materials" components/MaterialStatusControl.tsx components/MaterialAttachments.tsx components/AddMaterialAttachment.tsx
git commit -m "feat(materials): detail page — fields, attachments, status toggle"
```

---

### Task 6: Dashboard pending-materials count

**Files:**
- Modify: `app/(app)/page.tsx`

**Interfaces:**
- Consumes: server `createClient`.

- [ ] **Step 1: Count proposed materials per project**

Modify `app/(app)/page.tsx`. After the existing `pendingRevs` fetch/tally, add a materials tally:
```tsx
const { data: proposedMats } = await supabase
  .from('materials')
  .select('id, project_id')
  .eq('status', 'proposed')
const materialsByProject = new Map<string, number>()
for (const mm of (proposedMats as { project_id: string }[] | null) ?? []) {
  materialsByProject.set(mm.project_id, (materialsByProject.get(mm.project_id) ?? 0) + 1)
}
```
(`materials.project_id` is a direct column, so no embed/cast is needed here.)

- [ ] **Step 2: Render it in the project row**

In the counts `<span>` of each project row, compute and append:
```tsx
// alongside the existing `const pending = pendingByProject.get(p.id) ?? 0`:
const matPending = materialsByProject.get(p.id) ?? 0
// in the counts span, after the pending-approvals text:
{` · materials pending ${matPending}`}
```

- [ ] **Step 3: Verify**

Add a material to a project (status defaults to `proposed`). Dashboard shows `materials pending 1` for that project; approving the material drops it to 0. `npx tsc --noEmit` passes.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/page.tsx"
git commit -m "feat(dashboard): per-project pending-materials count"
```

---

## Self-Review

**Spec coverage:**
- Data model + enums (spec §3) → Task 1. ✓
- Decision toggle + `decided_at`/`decided_by` (§4) → Task 2 (pure) + Task 3 (`setMaterialStatus`). ✓
- Storage bucket + signed URLs + photo/datasheet (§5) → Task 1 (bucket), Task 3 (`signedMaterialUrl`), Task 5 (`MaterialAttachments`, `AddMaterialAttachment`). ✓
- RLS (§6) → Task 1. ✓
- Register + filters + Materials link (§7) → Task 4; detail + attachments + status toggle → Task 5; dashboard count → Task 6. ✓
- Pure module + tests (§8) → Task 2. ✓
- File layout (§9) → matches tasks. ✓

**Placeholder scan:** No TBD/TODO; every code step has runnable code; verify steps name concrete commands/observations.

**Type consistency:** `MaterialStatus` defined in `lib/materials.ts` (Task 2), imported by `material-actions.ts` (Task 3), `MaterialStatusControl` + detail page (Task 5), and matches the `database.types.ts` alias (Task 1). `RoomOption` defined in `NewMaterialForm` (Task 4) and consumed by the register page (Task 4). `createMaterial`/`addMaterialAttachment`/`setMaterialStatus`/`signedMaterialUrl` signatures identical across producer (Task 3) and callers (Tasks 4/5). `categoryLabel` used in Tasks 4/5 as defined in Task 2. Upload-error guarding present in `AddMaterialAttachment` (Task 5) per Global Constraints. ✓

**Ordering note:** schema/types (1) → pure logic (2) → actions (3) → register (4) → detail (5) → dashboard (6); each compiles independently. Task 5's status control depends on Task 2's `nextMaterialStatuses`; Task 6 depends on the `proposed` status reachable from Task 4's create.
