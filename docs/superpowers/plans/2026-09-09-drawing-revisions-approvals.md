# Drawing Revisions + Approvals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project drawing register whose drawings carry versioned revisions moving through an internal reviewer approval status-machine, with tickets able to link to a revision.

**Architecture:** Extends the existing Next.js App Router + Supabase MVP. New tables `drawings` / `drawing_revisions` and a `revision_status` enum; a pure `lib/revision-status.ts` module (like `lib/status.ts`) holds the transition rules; server actions do the writes; files live in a new private `drawing-files` bucket served via signed URLs. Reuses established patterns: server-action forms with explicit submit buttons, client upload → server action to record the row, `as never` enum-insert casts, nested-embed casts through `unknown`.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind 3.4, `@supabase/supabase-js` 2.x, `@supabase/ssr` 0.12.x, Vitest 2.x.

**Spec:** `docs/superpowers/specs/2026-09-09-drawing-revisions-approvals-design.md`

## Global Constraints

- **Reuse the direct Supabase connection** already configured in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). No proxy.
- **TypeScript `strict`**, no `any` in `lib/`.
- **`revision_status` enum (verbatim):** draft, under_review, approved, approved_with_comments, changes_requested, rejected, superseded.
- **Storage bucket:** `drawing-files` (private). Object path: `{project_id}/{drawing_id}/{uuid}.{ext}`.
- **Server-action forms MUST have an explicit submit `<button>`** (a buttonless Enter-only form was a confirmed bug in slice 1).
- **Enum-typed inserts/updates from string form data** use `as never` (the pattern established in `app/(app)/actions.ts`).
- **Supabase nested embeds** (e.g. `drawing_revisions(...)`) type as `SelectQueryError` because `database.types.ts` has empty `Relationships`; cast those query results through `unknown`.
- **`database.types.ts` empties stay `{ [_ in never]: never }`** — never `Record<string, never>`.

---

### Task 1: Migration + generated types

**Files:**
- Create: `supabase/migrations/0002_drawings.sql`
- Modify: `lib/database.types.ts`

**Interfaces:**
- Produces the `drawings` / `drawing_revisions` tables, `revision_status` enum, two nullable `tickets` columns, RLS, and the `drawing-files` bucket; plus matching TypeScript types.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0002_drawings.sql`:
```sql
create type revision_status as enum
  ('draft','under_review','approved','approved_with_comments','changes_requested','rejected','superseded');

create table drawings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  floor_id uuid references floors(id) on delete set null,
  discipline discipline,
  title text not null,
  drawing_number text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index drawings_project_idx on drawings(project_id);

create table drawing_revisions (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid not null references drawings(id) on delete cascade,
  revision_no int not null,
  storage_path text not null,
  status revision_status not null default 'draft',
  reviewer_id uuid references profiles(id) on delete set null,
  notes text,
  uploaded_by uuid references profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (drawing_id, revision_no)
);
create index drawing_revisions_drawing_idx on drawing_revisions(drawing_id);

alter table tickets
  add column drawing_id uuid references drawings(id) on delete set null,
  add column drawing_revision_id uuid references drawing_revisions(id) on delete set null;

alter table drawings enable row level security;
alter table drawing_revisions enable row level security;
create policy drawings_all on drawings for all to authenticated using (true) with check (true);
create policy drawing_revisions_all on drawing_revisions for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('drawing-files','drawing-files', false)
  on conflict (id) do nothing;
create policy drawing_files_read on storage.objects for select to authenticated
  using (bucket_id = 'drawing-files');
create policy drawing_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'drawing-files');
```

- [ ] **Step 2: Apply it**

Supabase Studio → SQL Editor → paste all of `0002_drawings.sql` → Run. Verify in Table editor: `drawings`, `drawing_revisions` exist; `tickets` has `drawing_id` + `drawing_revision_id`; Storage shows a private `drawing-files` bucket.

- [ ] **Step 3: Add the types**

Edit `lib/database.types.ts`. Add a `revision_status` union near the other enum type aliases:
```ts
type RevisionStatus =
  | 'draft' | 'under_review' | 'approved' | 'approved_with_comments'
  | 'changes_requested' | 'rejected' | 'superseded'
```
Add two tables inside `public.Tables` (alongside the others):
```ts
      drawings: {
        Row: {
          id: string; project_id: string; building_id: string | null; floor_id: string | null
          discipline: Discipline | null; title: string; drawing_number: string | null
          created_by: string | null; created_at: string
        }
        Insert: {
          id?: string; project_id: string; building_id?: string | null; floor_id?: string | null
          discipline?: Discipline | null; title: string; drawing_number?: string | null
          created_by?: string | null; created_at?: string
        }
        Update: {
          id?: string; project_id?: string; building_id?: string | null; floor_id?: string | null
          discipline?: Discipline | null; title?: string; drawing_number?: string | null
          created_by?: string | null; created_at?: string
        }
        Relationships: []
      }
      drawing_revisions: {
        Row: {
          id: string; drawing_id: string; revision_no: number; storage_path: string
          status: RevisionStatus; reviewer_id: string | null; notes: string | null
          uploaded_by: string | null; decided_at: string | null; created_at: string
        }
        Insert: {
          id?: string; drawing_id: string; revision_no: number; storage_path: string
          status?: RevisionStatus; reviewer_id?: string | null; notes?: string | null
          uploaded_by?: string | null; decided_at?: string | null; created_at?: string
        }
        Update: {
          id?: string; drawing_id?: string; revision_no?: number; storage_path?: string
          status?: RevisionStatus; reviewer_id?: string | null; notes?: string | null
          uploaded_by?: string | null; decided_at?: string | null; created_at?: string
        }
        Relationships: []
      }
```
In the `tickets` table type, add to **Row/Insert/Update** the two columns:
```ts
        // Row:
        drawing_id: string | null; drawing_revision_id: string | null
        // Insert & Update:
        drawing_id?: string | null; drawing_revision_id?: string | null
```
Add to `public.Enums`:
```ts
      revision_status: RevisionStatus
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes (existing code still compiles with the added columns/tables).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_drawings.sql lib/database.types.ts
git commit -m "feat(db): drawings + revisions schema, revision_status, ticket links"
```

---

### Task 2: Revision status logic (pure, TDD)

**Files:**
- Create: `lib/revision-status.ts`
- Test: `tests/revision-status.test.ts`

**Interfaces:**
- Produces:
  - `type RevisionStatus = 'draft' | 'under_review' | 'approved' | 'approved_with_comments' | 'changes_requested' | 'rejected' | 'superseded'`
  - `allowedRevisionTransitions(status: RevisionStatus): RevisionStatus[]` — manual transitions only; never returns `superseded`.
  - `isApproved(status: RevisionStatus): boolean` — true for `approved` and `approved_with_comments`.
  - `formatRevision(n: number): string` — zero-padded, `1 → "R01"`, `12 → "R12"`.

- [ ] **Step 1: Write the failing test**

Create `tests/revision-status.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { allowedRevisionTransitions, isApproved, formatRevision } from '@/lib/revision-status'

describe('allowedRevisionTransitions', () => {
  it('draft can only be submitted for review', () => {
    expect(allowedRevisionTransitions('draft')).toEqual(['under_review'])
  })
  it('under_review offers the four decisions', () => {
    expect(allowedRevisionTransitions('under_review').sort()).toEqual(
      ['approved', 'approved_with_comments', 'changes_requested', 'rejected'],
    )
  })
  it('changes_requested can be resubmitted', () => {
    expect(allowedRevisionTransitions('changes_requested')).toEqual(['under_review'])
  })
  it('never offers superseded as a manual move', () => {
    const all = (['draft', 'under_review', 'approved', 'approved_with_comments',
      'changes_requested', 'rejected', 'superseded'] as const)
      .flatMap((s) => allowedRevisionTransitions(s))
    expect(all).not.toContain('superseded')
  })
  it('terminal states have no manual transitions', () => {
    expect(allowedRevisionTransitions('rejected')).toEqual([])
    expect(allowedRevisionTransitions('superseded')).toEqual([])
  })
})

describe('isApproved', () => {
  it('is true for approved and approved_with_comments only', () => {
    expect(isApproved('approved')).toBe(true)
    expect(isApproved('approved_with_comments')).toBe(true)
    expect(isApproved('under_review')).toBe(false)
    expect(isApproved('superseded')).toBe(false)
  })
})

describe('formatRevision', () => {
  it('zero-pads to two digits with an R prefix', () => {
    expect(formatRevision(1)).toBe('R01')
    expect(formatRevision(9)).toBe('R09')
    expect(formatRevision(12)).toBe('R12')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- revision-status`
Expected: FAIL — cannot resolve `@/lib/revision-status`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/revision-status.ts`:
```ts
export type RevisionStatus =
  | 'draft' | 'under_review' | 'approved' | 'approved_with_comments'
  | 'changes_requested' | 'rejected' | 'superseded'

const TRANSITIONS: Record<RevisionStatus, RevisionStatus[]> = {
  draft: ['under_review'],
  under_review: ['approved', 'approved_with_comments', 'changes_requested', 'rejected'],
  changes_requested: ['under_review'],
  approved: [],
  approved_with_comments: [],
  rejected: [],
  superseded: [],
}

export function allowedRevisionTransitions(status: RevisionStatus): RevisionStatus[] {
  return TRANSITIONS[status]
}

export function isApproved(status: RevisionStatus): boolean {
  return status === 'approved' || status === 'approved_with_comments'
}

export function formatRevision(n: number): string {
  return `R${String(n).padStart(2, '0')}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- revision-status` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/revision-status.ts tests/revision-status.test.ts
git commit -m "feat(logic): revision approval status machine"
```

---

### Task 3: Drawing server actions

**Files:**
- Create: `app/(app)/drawing-actions.ts`

**Interfaces:**
- Consumes: `allowedRevisionTransitions`, `isApproved`, `type RevisionStatus` from `@/lib/revision-status`; server `createClient`.
- Produces server actions:
  - `createDrawing(formData: FormData)` — inserts a `drawings` row; `revalidatePath('/projects/'+project_id+'/drawings')`.
  - `createRevision(input: { drawingId: string; projectId: string; storagePath: string }): Promise<void>` — inserts the next `drawing_revisions` row at `draft` (revision_no = max+1, one retry on unique conflict).
  - `reviewRevision(formData: FormData)` — validates via `allowedRevisionTransitions`, updates status + `decided_at`; on approval, supersedes other approved revisions of the same drawing.
  - `signedDrawingUrl(path: string): Promise<string>`.

- [ ] **Step 1: Write the actions**

Create `app/(app)/drawing-actions.ts`:
```ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { allowedRevisionTransitions, isApproved, type RevisionStatus } from '@/lib/revision-status'

export async function createDrawing(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim()
  const projectId = String(formData.get('project_id'))
  if (!title || !projectId) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const opt = (k: string) => { const v = String(formData.get(k) ?? ''); return v || null }
  await supabase.from('drawings').insert({
    project_id: projectId,
    title,
    drawing_number: opt('drawing_number'),
    discipline: (opt('discipline') as never) ?? null,
    building_id: opt('building_id'),
    floor_id: opt('floor_id'),
    created_by: user!.id,
  })
  revalidatePath(`/projects/${projectId}/drawings`)
}

export async function createRevision(input: {
  drawingId: string; projectId: string; storagePath: string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: last } = await supabase
      .from('drawing_revisions')
      .select('revision_no')
      .eq('drawing_id', input.drawingId)
      .order('revision_no', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextNo = (last?.revision_no ?? 0) + 1
    const { error } = await supabase.from('drawing_revisions').insert({
      drawing_id: input.drawingId,
      revision_no: nextNo,
      storage_path: input.storagePath,
      uploaded_by: user!.id,
    })
    if (!error) break // success
    // 23505 = unique_violation: another upload took this number; retry once.
    if (error.code !== '23505' || attempt === 1) { console.error('createRevision failed:', JSON.stringify(error)); break }
  }
  revalidatePath(`/drawings/${input.drawingId}`)
}

export async function reviewRevision(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('revision_id'))
  const to = String(formData.get('to')) as RevisionStatus
  const { data: rev } = await supabase
    .from('drawing_revisions')
    .select('status, drawing_id')
    .eq('id', id)
    .single()
  if (!rev) return
  if (!allowedRevisionTransitions(rev.status as RevisionStatus).includes(to)) return

  const decided = ['approved', 'approved_with_comments', 'changes_requested', 'rejected'].includes(to)
  await supabase
    .from('drawing_revisions')
    .update({ status: to as never, decided_at: decided ? new Date().toISOString() : null })
    .eq('id', id)

  if (isApproved(to)) {
    // supersede any OTHER currently-approved revision of the same drawing
    await supabase
      .from('drawing_revisions')
      .update({ status: 'superseded' as never })
      .eq('drawing_id', rev.drawing_id)
      .neq('id', id)
      .in('status', ['approved', 'approved_with_comments'])
  }
  revalidatePath(`/drawings/${rev.drawing_id}`)
}

export async function signedDrawingUrl(path: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from('drawing-files').createSignedUrl(path, 3600)
  return data?.signedUrl ?? ''
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/drawing-actions.ts"
git commit -m "feat(drawings): server actions for create/upload/review + signed URLs"
```

---

### Task 4: Drawing register page

**Files:**
- Create: `app/(app)/projects/[id]/drawings/page.tsx`, `components/NewDrawingForm.tsx`, `components/DrawingList.tsx`
- Modify: `app/(app)/projects/[id]/page.tsx` (add a "Drawings" link)

**Interfaces:**
- Consumes: `createDrawing` from `@/app/(app)/drawing-actions`; `formatRevision` from `@/lib/revision-status`; server `createClient`.

- [ ] **Step 1: NewDrawingForm**

Create `components/NewDrawingForm.tsx`:
```tsx
'use client'
import { createDrawing } from '@/app/(app)/drawing-actions'

const DISCIPLINE = ['', 'architectural', 'structural', 'electrical', 'plumbing', 'fire_safety',
  'interior', 'landscape', 'construction', 'documentation', 'client_coordination']

export function NewDrawingForm({ projectId }: { projectId: string }) {
  return (
    <form action={createDrawing} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="project_id" value={projectId} />
      <input name="title" placeholder="Drawing title" required className="rounded border p-1" />
      <input name="drawing_number" placeholder="Sheet no (E-101)" className="rounded border p-1" />
      <select name="discipline" className="rounded border p-1">
        {DISCIPLINE.map((d) => <option key={d} value={d}>{d || 'discipline'}</option>)}
      </select>
      <button type="submit" className="rounded bg-black px-3 text-white">Add drawing</button>
    </form>
  )
}
```

- [ ] **Step 2: DrawingList**

Create `components/DrawingList.tsx`:
```tsx
import Link from 'next/link'
import { formatRevision } from '@/lib/revision-status'

type Row = {
  id: string; drawing_number: string | null; title: string; discipline: string | null
  latestNo: number | null; latestStatus: string | null
}

export function DrawingList({ drawings }: { drawings: Row[] }) {
  if (drawings.length === 0) return <p className="text-sm text-gray-500">No drawings yet.</p>
  return (
    <ul className="divide-y rounded border">
      {drawings.map((d) => (
        <li key={d.id} className="flex items-center justify-between p-2 text-sm">
          <Link href={`/drawings/${d.id}`} className="flex items-center gap-2">
            {d.drawing_number && <span className="font-mono text-xs text-gray-500">{d.drawing_number}</span>}
            <span>{d.title}</span>
            {d.discipline && <span className="text-xs text-gray-400">{d.discipline}</span>}
          </Link>
          <span className="text-xs text-gray-500">
            {d.latestNo ? `${formatRevision(d.latestNo)} · ${d.latestStatus}` : 'no revisions'}
          </span>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: Register page**

Create `app/(app)/projects/[id]/drawings/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewDrawingForm } from '@/components/NewDrawingForm'
import { DrawingList } from '@/components/DrawingList'

type DrawingRow = {
  id: string; drawing_number: string | null; title: string; discipline: string | null
  drawing_revisions: { revision_no: number; status: string }[]
}

export default async function DrawingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('name').eq('id', id).single()
  const { data: rows } = await supabase
    .from('drawings')
    .select('id, drawing_number, title, discipline, drawing_revisions(revision_no, status)')
    .eq('project_id', id)
    .order('created_at')

  const drawings = ((rows as unknown as DrawingRow[]) ?? []).map((d) => {
    const latest = [...(d.drawing_revisions ?? [])].sort((a, b) => b.revision_no - a.revision_no)[0]
    return {
      id: d.id, drawing_number: d.drawing_number, title: d.title, discipline: d.discipline,
      latestNo: latest?.revision_no ?? null, latestStatus: latest?.status ?? null,
    }
  })

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{project?.name} — Drawings</h1>
        <Link href={`/projects/${id}`} className="text-sm text-gray-500">← project</Link>
      </div>
      <NewDrawingForm projectId={id} />
      <DrawingList drawings={drawings} />
    </main>
  )
}
```

- [ ] **Step 4: Link from the project page**

Modify `app/(app)/projects/[id]/page.tsx`: add a Drawings link next to the project title. Change the heading block:
```tsx
// import at top:
import Link from 'next/link'
// replace the <h1>{project?.name}</h1> line with:
<div className="flex items-center gap-3">
  <h1 className="text-xl font-semibold">{project?.name}</h1>
  <Link href={`/projects/${id}/drawings`} className="text-sm text-gray-500">Drawings →</Link>
</div>
```

- [ ] **Step 5: Verify**

Run `npm run dev`, open a project → click "Drawings →" → add a drawing (title + sheet no + discipline) → it appears with "no revisions". `npx tsc --noEmit` passes.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/projects/[id]/drawings" components/NewDrawingForm.tsx components/DrawingList.tsx "app/(app)/projects/[id]/page.tsx"
git commit -m "feat(drawings): project drawing register + create"
```

---

### Task 5: Drawing detail — revisions, upload, review, preview

**Files:**
- Create: `app/(app)/drawings/[id]/page.tsx`, `components/UploadRevision.tsx`, `components/RevisionHistory.tsx`, `components/RevisionPreview.tsx`

**Interfaces:**
- Consumes: `createRevision`, `reviewRevision`, `signedDrawingUrl` from `@/app/(app)/drawing-actions`; `allowedRevisionTransitions`, `formatRevision` from `@/lib/revision-status`; browser `createClient` (upload).

- [ ] **Step 1: UploadRevision (client)**

Create `components/UploadRevision.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createRevision } from '@/app/(app)/drawing-actions'

export function UploadRevision({ drawingId, projectId }: { drawingId: string; projectId: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!file) return
    setBusy(true)
    const ext = file.name.split('.').pop() || 'pdf'
    const path = `${projectId}/${drawingId}/${crypto.randomUUID()}.${ext}`
    await createClient().storage.from('drawing-files').upload(path, file)
    await createRevision({ drawingId, projectId, storagePath: path })
    setFile(null)
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept=".pdf,image/*,.dwg,.dxf,.rvt"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        disabled={!file || busy}
        onClick={submit}
        className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        {busy ? 'Uploading…' : 'Upload revision'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: RevisionPreview (by extension)**

Create `components/RevisionPreview.tsx`:
```tsx
const IMG = ['png', 'jpg', 'jpeg', 'webp', 'gif']

export function RevisionPreview({ url, path }: { url: string; path: string }) {
  if (!url) return null
  const ext = (path.split('.').pop() || '').toLowerCase()
  if (ext === 'pdf') {
    return <iframe src={url} className="h-[70vh] w-full rounded border" title="drawing" />
  }
  if (IMG.includes(ext)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="max-w-full rounded border" />
  }
  return (
    <a href={url} className="text-sm text-blue-600 underline" target="_blank" rel="noreferrer">
      Download file (.{ext})
    </a>
  )
}
```

- [ ] **Step 3: RevisionHistory (server component with review actions)**

Create `components/RevisionHistory.tsx`:
```tsx
import { reviewRevision } from '@/app/(app)/drawing-actions'
import { allowedRevisionTransitions, formatRevision, type RevisionStatus } from '@/lib/revision-status'

const LABEL: Record<string, string> = {
  under_review: 'Submit for review',
  approved: 'Approve',
  approved_with_comments: 'Approve w/ comments',
  changes_requested: 'Request changes',
  rejected: 'Reject',
}

type Rev = {
  id: string; revision_no: number; status: RevisionStatus
  created_at: string; uploader: string | null
}

export function RevisionHistory({ revisions }: { revisions: Rev[] }) {
  if (revisions.length === 0) return <p className="text-sm text-gray-500">No revisions yet.</p>
  return (
    <ul className="divide-y rounded border">
      {revisions.map((r) => (
        <li key={r.id} className="flex items-center justify-between p-2 text-sm">
          <span className="flex items-center gap-3">
            <span className="font-mono">{formatRevision(r.revision_no)}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{r.status}</span>
            <span className="text-xs text-gray-500">{r.uploader ?? 'someone'}</span>
          </span>
          <span className="flex gap-1">
            {allowedRevisionTransitions(r.status).map((to) => (
              <form key={to} action={reviewRevision}>
                <input type="hidden" name="revision_id" value={r.id} />
                <input type="hidden" name="to" value={to} />
                <button type="submit" className="rounded border px-2 py-1 text-xs">{LABEL[to] ?? to}</button>
              </form>
            ))}
          </span>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Drawing detail page**

Create `app/(app)/drawings/[id]/page.tsx`:
```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signedDrawingUrl } from '@/app/(app)/drawing-actions'
import { formatRevision, type RevisionStatus } from '@/lib/revision-status'
import { UploadRevision } from '@/components/UploadRevision'
import { RevisionHistory } from '@/components/RevisionHistory'
import { RevisionPreview } from '@/components/RevisionPreview'

type RevRow = {
  id: string; revision_no: number; status: RevisionStatus; storage_path: string
  created_at: string; profiles: { full_name: string | null } | null
}

export default async function DrawingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: d } = await supabase
    .from('drawings')
    .select('id, title, drawing_number, discipline, project_id')
    .eq('id', id)
    .single()
  if (!d) notFound()

  const { data: revRows } = await supabase
    .from('drawing_revisions')
    .select('id, revision_no, status, storage_path, created_at, profiles:uploaded_by(full_name)')
    .eq('drawing_id', id)
    .order('revision_no', { ascending: false })
  const revisions = (revRows as unknown as RevRow[]) ?? []

  const latest = revisions[0]
  const previewUrl = latest ? await signedDrawingUrl(latest.storage_path) : ''

  const { data: linked } = await supabase
    .from('tickets')
    .select('id, seq, type, title')
    .eq('drawing_id', id)
    .order('seq', { ascending: false })

  return (
    <main className="max-w-3xl space-y-5">
      <div>
        <Link href={`/projects/${d.project_id}/drawings`} className="text-sm text-gray-500">← drawings</Link>
        <h1 className="text-xl font-semibold">
          {d.drawing_number && <span className="font-mono text-gray-500">{d.drawing_number} </span>}
          {d.title}
        </h1>
        {d.discipline && <div className="text-xs text-gray-500">{d.discipline}</div>}
      </div>

      <UploadRevision drawingId={d.id} projectId={d.project_id} />

      <RevisionHistory
        revisions={revisions.map((r) => ({
          id: r.id, revision_no: r.revision_no, status: r.status,
          created_at: r.created_at, uploader: r.profiles?.full_name ?? null,
        }))}
      />

      {latest && (
        <section className="space-y-1">
          <h4 className="text-sm font-medium">Preview — {formatRevision(latest.revision_no)}</h4>
          <RevisionPreview url={previewUrl} path={latest.storage_path} />
        </section>
      )}

      <section className="space-y-1">
        <h4 className="text-sm font-medium">Linked tickets</h4>
        {(linked ?? []).length === 0 && <p className="text-sm text-gray-400">None.</p>}
        <ul className="text-sm">
          {(linked ?? []).map((t) => (
            <li key={t.id}>
              <Link href={`/tickets/${t.id}`} className="text-blue-600">
                {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq} {t.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Verify the loop**

`npm run dev`: open a drawing → Upload revision (pick a PDF or image) → `R01 · draft` appears + preview renders. Click **Submit for review** → `under_review`, actions become Approve/…/Reject. Click **Approve** → `approved`. Upload a second revision, submit, approve → `R02 approved` and `R01` flips to `superseded`. `npx tsc --noEmit` passes.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/drawings" components/UploadRevision.tsx components/RevisionHistory.tsx components/RevisionPreview.tsx
git commit -m "feat(drawings): detail page — upload, review actions, preview, supersede"
```

---

### Task 6: Link tickets to a revision

**Files:**
- Create: `components/DrawingRevisionSelect.tsx`
- Modify: `app/(app)/actions.ts` (createTicket accepts drawing refs), `components/NewTicketForm.tsx`, `app/(app)/projects/[id]/page.tsx` (fetch + pass revisions), `app/(app)/tickets/[id]/page.tsx` (show link)

**Interfaces:**
- Consumes: `formatRevision` from `@/lib/revision-status`.
- `createTicket` additionally reads `drawing_id` + `drawing_revision_id` from the form.

- [ ] **Step 1: Extend createTicket**

In `app/(app)/actions.ts`, inside `createTicket`'s insert object, add the two fields (using the existing `opt` helper):
```ts
    drawing_id: opt('drawing_id'),
    drawing_revision_id: opt('drawing_revision_id'),
```

- [ ] **Step 2: DrawingRevisionSelect**

Create `components/DrawingRevisionSelect.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { formatRevision } from '@/lib/revision-status'

export type RevisionOption = { revisionId: string; drawingId: string; label: string }

export function DrawingRevisionSelect({ options }: { options: RevisionOption[] }) {
  const [drawingId, setDrawingId] = useState('')
  const selected = options.find((o) => o.revisionId === drawingId)
  return (
    <>
      <select
        className="rounded border p-1"
        defaultValue=""
        onChange={(e) => setDrawingId(e.target.value)}
        name="drawing_revision_id"
      >
        <option value="">no drawing</option>
        {options.map((o) => (
          <option key={o.revisionId} value={o.revisionId}>{o.label}</option>
        ))}
      </select>
      <input type="hidden" name="drawing_id" value={selected?.drawingId ?? ''} />
    </>
  )
}

export { formatRevision }
```

- [ ] **Step 3: Add the select to NewTicketForm**

Modify `components/NewTicketForm.tsx`: accept an optional `revisionOptions` prop and render the select before the submit button.
```tsx
// update the signature:
import { DrawingRevisionSelect, type RevisionOption } from '@/components/DrawingRevisionSelect'
export function NewTicketForm({ projectId, revisionOptions = [] }:
  { projectId: string; revisionOptions?: RevisionOption[] }) {
  // ...existing fields...
  // add before <button ...>Add</button>:
  //   {revisionOptions.length > 0 && <DrawingRevisionSelect options={revisionOptions} />}
```
Add `<DrawingRevisionSelect options={revisionOptions} />` inside the form (guarded by `revisionOptions.length > 0`), just before the `Add` button.

- [ ] **Step 4: Feed revision options from the project page**

Modify `app/(app)/projects/[id]/page.tsx`: fetch the project's revisions and build options, pass to `NewTicketForm`.
```tsx
// import:
import { formatRevision } from '@/lib/revision-status'
import type { RevisionOption } from '@/components/DrawingRevisionSelect'
// after loading tickets, add:
const { data: drawingRows } = await supabase
  .from('drawings')
  .select('id, title, drawing_revisions(id, revision_no)')
  .eq('project_id', id)
type DR = { id: string; title: string; drawing_revisions: { id: string; revision_no: number }[] }
const revisionOptions: RevisionOption[] = ((drawingRows as unknown as DR[]) ?? []).flatMap((d) =>
  (d.drawing_revisions ?? []).map((r) => ({
    revisionId: r.id, drawingId: d.id, label: `${d.title} ${formatRevision(r.revision_no)}`,
  })),
)
// pass it:
// <NewTicketForm projectId={id} revisionOptions={revisionOptions} />
```

- [ ] **Step 5: Show the link on ticket detail**

Modify `app/(app)/tickets/[id]/page.tsx`: select `drawing_id` on the ticket and, when set, render a link. Add `drawing_id` to the ticket `.select(...)` string, then near the meta row:
```tsx
{t.drawing_id && (
  <Link href={`/drawings/${t.drawing_id}`} className="text-xs text-blue-600">linked drawing →</Link>
)}
```
(Import `Link from 'next/link'` if not already imported.)

- [ ] **Step 6: Verify**

Create a drawing + a revision in a project. On that project, add a ticket and pick the revision from the "no drawing" dropdown → save. Open the ticket → "linked drawing →" appears and navigates to the drawing, whose "Linked tickets" now lists it. `npx tsc --noEmit` passes.

- [ ] **Step 7: Commit**

```bash
git add components/DrawingRevisionSelect.tsx "app/(app)/actions.ts" components/NewTicketForm.tsx "app/(app)/projects/[id]/page.tsx" "app/(app)/tickets/[id]/page.tsx"
git commit -m "feat(drawings): link tickets to a drawing revision"
```

---

### Task 7: Dashboard pending-approvals count

**Files:**
- Modify: `app/(app)/page.tsx`

**Interfaces:**
- Consumes: server `createClient`.

- [ ] **Step 1: Count under_review revisions per project**

Modify `app/(app)/page.tsx`. After the existing `tickets` fetch, fetch under_review revisions with their project id (via the parent drawing), and tally per project:
```tsx
const { data: pendingRevs } = await supabase
  .from('drawing_revisions')
  .select('id, drawings(project_id)')
  .eq('status', 'under_review')
type PR = { drawings: { project_id: string } | null }
const pendingByProject = new Map<string, number>()
for (const r of (pendingRevs as unknown as PR[]) ?? []) {
  const pid = r.drawings?.project_id
  if (pid) pendingByProject.set(pid, (pendingByProject.get(pid) ?? 0) + 1)
}
```

- [ ] **Step 2: Render it in the project row**

In the counts `<span>` of each project row, append the pending count:
```tsx
// inside the map, compute:
const pending = pendingByProject.get(p.id) ?? 0
// in the counts span, add:
{` · pending approvals ${pending}`}
```

- [ ] **Step 3: Verify**

Upload a revision in some project and click **Submit for review**. Dashboard shows `pending approvals 1` for that project; approving it drops it back to 0. `npx tsc --noEmit` passes.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/page.tsx"
git commit -m "feat(dashboard): per-project pending drawing-approval count"
```

---

## Self-Review

**Spec coverage:**
- Data model + enum + ticket alter (spec §3) → Task 1. ✓
- Status machine + supersede + decided_at (§4) → Task 2 (pure) + Task 3 (`reviewRevision`). ✓
- Storage bucket + signed URLs + preview by extension (§5) → Task 1 (bucket), Task 3 (`signedDrawingUrl`), Task 5 (`RevisionPreview`, `UploadRevision`). ✓
- RLS (§6) → Task 1. ✓
- Register page (§7) → Task 4; detail page → Task 5; ticket link → Task 6; dashboard count → Task 7. ✓
- Pure module + tests (§8) → Task 2. ✓
- File layout (§9) → matches tasks. ✓

**Placeholder scan:** No TBD/TODO; every code step has runnable code; verify steps name concrete commands/observations.

**Type consistency:** `RevisionStatus` defined in `lib/revision-status.ts` (Task 2), imported by `drawing-actions.ts` (Task 3), `RevisionHistory` (Task 5), page types (Task 5). `RevisionOption` defined in `DrawingRevisionSelect` (Task 6) and consumed by `NewTicketForm` + project page (Task 6). `createRevision({drawingId, projectId, storagePath})` signature identical in producer (Task 3) and caller (Task 5). `signedDrawingUrl(path)` matches. `formatRevision(n)` used in Tasks 4/5/6 as defined in Task 2. ✓

**Ordering note:** Tasks are ordered so each compiles and is testable alone: schema/types (1) → pure logic (2) → actions (3) → register (4) → detail/loop (5) → ticket linkage (6) → dashboard (7). Task 6 depends on drawings existing (Tasks 3–5); Task 7 depends on the `under_review` status reachable via Task 5.
