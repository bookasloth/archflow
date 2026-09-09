# Slice 10 — Drawing register + two-way links — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Make the drawing register + drawing detail read like a professional drawing register (number/title/discipline/current rev + approval), wire the drawing's linked tickets to the unified drawer, and surface the linked drawing inside the ticket drawer — completing Ticket↔Drawing both ways.

**Architecture:** Reuse existing revision logic/components (`RevisionHistory`, `RevisionPreview`, `UploadRevision`, `reviewRevision`, `lib/revision-status`). Apply the design system (`PageHeader`/`Section`/`RevisionBadge`/`DisciplineBadge`). Linked tickets open via `?ticket=` + `TicketDrawer`. `getTicketDetail` gains a drawing embed; the drawer shows it.

**Tech Stack:** Next.js 15 RSC, Supabase, Tailwind. No new deps.

**Spec:** roadmap Slice 10 / P2 (§13). Base: `feat/ux-foundation` (stacked on Slice 9).

## Global Constraints
- No new deps, no schema change. Do not change revision transition rules (`lib/revision-status`) or the `reviewRevision` action.
- Reuse existing revision components; only restyle/rewire, don't duplicate logic.
- Linked tickets open the unified drawer (`?ticket=` + `TicketDrawer`), not `/tickets/[id]` navigation.
- `getTicketDetail` change is additive (drawing embed); the detail page (`/tickets/[id]`) already shows the drawing and must keep working.
- Approval status shown via `RevisionBadge`; current revision via `formatRevision`.

---

### Task 1: Drawing detail uplift + linked tickets → drawer

**Files:**
- Modify (replace): `app/(app)/drawings/[id]/page.tsx`
- Modify: `components/RevisionHistory.tsx` (status text → `RevisionBadge`)

- [ ] **Step 1: Rewrite `app/(app)/drawings/[id]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signedDrawingUrl } from '@/app/(app)/drawing-actions'
import { formatRevision, type RevisionStatus } from '@/lib/revision-status'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { RevisionBadge, DisciplineBadge } from '@/components/ui/Badge'
import { UploadRevision } from '@/components/UploadRevision'
import { RevisionHistory } from '@/components/RevisionHistory'
import { RevisionPreview } from '@/components/RevisionPreview'
import { TicketDrawer } from '@/components/TicketDrawer'
import type { Discipline } from '@/lib/labels'

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
  type LT = { id: string; seq: number; type: string; title: string }
  const linkedTickets = (linked as LT[]) ?? []

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title={
          <span className="flex items-baseline gap-2">
            {d.drawing_number && <span className="font-mono text-base text-ink-faint">{d.drawing_number}</span>}
            <span>{d.title}</span>
          </span>
        }
        meta={
          <>
            {d.discipline && <DisciplineBadge discipline={d.discipline as Discipline} />}
            {latest && <RevisionBadge status={latest.status} />}
            {latest && <span className="text-ink-faint">Current {formatRevision(latest.revision_no)}</span>}
          </>
        }
        actions={<Link href={`/projects/${d.project_id}/drawings`} className="text-sm text-ink-muted hover:text-ink">← Drawings</Link>}
      />

      <UploadRevision drawingId={d.id} projectId={d.project_id} />

      <Section title="Revision history">
        <RevisionHistory
          revisions={revisions.map((r) => ({
            id: r.id, revision_no: r.revision_no, status: r.status,
            created_at: r.created_at, uploader: r.profiles?.full_name ?? null,
          }))}
        />
      </Section>

      {latest && (
        <Section title={`Preview — ${formatRevision(latest.revision_no)}`}>
          <RevisionPreview url={previewUrl} path={latest.storage_path} />
        </Section>
      )}

      <Section title={`Linked tickets · ${linkedTickets.length}`}>
        {linkedTickets.length === 0 ? (
          <p className="text-sm text-ink-faint">None.</p>
        ) : (
          <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
            {linkedTickets.map((t) => (
              <li key={t.id} className="hover:bg-surface-hover">
                <Link href={`/drawings/${d.id}?ticket=${t.id}`} className="flex items-center gap-2 p-2.5">
                  <span className="font-mono text-xs text-ink-faint">
                    {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
                  </span>
                  <span className="truncate text-ink">{t.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <TicketDrawer />
    </div>
  )
}
```

- [ ] **Step 2: `components/RevisionHistory.tsx` — status text → `RevisionBadge`**

Add `import { RevisionBadge } from '@/components/ui/Badge'`. Replace the raw status span:
```tsx
<span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{r.status}</span>
```
with:
```tsx
<RevisionBadge status={r.status} />
```
Leave the transition buttons + everything else unchanged.

- [ ] **Step 3: Verify + commit**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean. Run vitest → 33/33.

```bash
git add "app/(app)/drawings/[id]/page.tsx" components/RevisionHistory.tsx
git commit -m "feat(ui): drawing detail register uplift + linked tickets open drawer"
```

---

### Task 2: Drawing register list uplift

**Files:**
- Modify: `components/DrawingList.tsx`
- Modify: `app/(app)/projects/[id]/drawings/page.tsx` (heading → PageHeader)

- [ ] **Step 1: Rewrite `components/DrawingList.tsx`**

```tsx
import Link from 'next/link'
import { formatRevision, type RevisionStatus } from '@/lib/revision-status'
import { RevisionBadge, DisciplineBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Discipline } from '@/lib/labels'

type Row = {
  id: string; drawing_number: string | null; title: string; discipline: string | null
  latestNo: number | null; latestStatus: string | null
}

export function DrawingList({ drawings }: { drawings: Row[] }) {
  if (drawings.length === 0)
    return <EmptyState title="No drawings yet" description="Drawings you add to this project will appear here with their revision history." />
  return (
    <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
      {drawings.map((d) => (
        <li key={d.id} className="hover:bg-surface-hover">
          <Link href={`/drawings/${d.id}`} className="flex items-center justify-between gap-3 p-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {d.drawing_number && <span className="font-mono text-xs text-ink-faint">{d.drawing_number}</span>}
              <span className="truncate text-ink">{d.title}</span>
              {d.discipline && <DisciplineBadge discipline={d.discipline as Discipline} />}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-ink-muted">
              {d.latestNo ? (
                <>
                  <span>{formatRevision(d.latestNo)}</span>
                  {d.latestStatus && <RevisionBadge status={d.latestStatus as RevisionStatus} />}
                </>
              ) : (
                <span className="text-ink-faint">no revisions</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Register page heading → `PageHeader`** in `app/(app)/projects/[id]/drawings/page.tsx`

Add `import { PageHeader } from '@/components/ui/PageHeader'`. Replace the heading `<div className="flex items-center gap-3">…</div>` with:
```tsx
<PageHeader title={`${project?.name ?? 'Project'} — Drawings`} />
```
Leave `NewDrawingForm`, `DrawingFilters`, `DrawingList` and the queries unchanged.

- [ ] **Step 3: Verify + commit**

Run tsc + vitest (33/33).

```bash
git add components/DrawingList.tsx "app/(app)/projects/[id]/drawings/page.tsx"
git commit -m "feat(ui): drawing register list uplift (badges + current revision)"
```

---

### Task 3: Ticket drawer shows its linked drawing

**Files:**
- Modify: `app/(app)/actions.ts` (`getTicketDetail` — add drawing embed)
- Modify: `components/TicketDrawer.tsx` (render linked drawing; align to tokens)

- [ ] **Step 1: Extend `getTicketDetail` select** in `app/(app)/actions.ts`

In `getTicketDetail`, change the tickets `.select(...)` to add a drawing embed:
```ts
    .select('id, seq, type, discipline, title, description, status, priority, due_date, project_id, drawing_id, drawing:drawing_id(drawing_number, title)')
```
Nothing else in the function changes (it still returns `{ ...t, photos, comments }`, now with `t.drawing`).

- [ ] **Step 2: Show the drawing in `components/TicketDrawer.tsx`**

Add a linked-drawing block after the header meta (before/around the description). Insert this where the detail header is rendered (after the `<div className="mt-1 flex gap-3 ...">…</div>` closing, still inside the header `<div>` or just below it):
```tsx
{detail.drawing_id && (
  <a
    href={`/drawings/${detail.drawing_id}`}
    className="mt-1 inline-block text-xs text-primary hover:underline"
  >
    {(detail as { drawing?: { drawing_number: string | null; title: string } | null }).drawing?.drawing_number
      ? `${(detail as { drawing?: { drawing_number: string | null } | null }).drawing!.drawing_number} — linked drawing`
      : 'Linked drawing'} →
  </a>
)}
```
(Use a plain `<a>` so it hard-navigates to the drawing page.) While here, align the drawer surface to tokens: change `bg-white` → `bg-surface`, the header `text-gray-500`/`text-gray-900` and body `text-gray-500` to `text-ink-muted`/`text-ink`, and the close button colors to `text-ink-muted hover:text-ink`. Do not change logic/props/effects.

- [ ] **Step 3: Verify + commit**

Run tsc + vitest (33/33). Manual (user): opening a ticket that has a linked drawing shows the drawing link in the drawer → clicking goes to the drawing page → which lists the ticket back (two-way). Drawing register + detail read as a register with badges.

```bash
git add "app/(app)/actions.ts" components/TicketDrawer.tsx
git commit -m "feat(ui): ticket drawer shows linked drawing (two-way ticket<->drawing)"
```

---

## Self-Review notes
- **Spec coverage (§13):** register list w/ number/title/discipline/current-rev/approval (T2); detail as register w/ history/preview/approval (T1); Ticket→Drawing in drawer (T3) + Drawing→Tickets already present, now opening the drawer (T1). Two-way complete.
- **Placeholder scan:** none. `<worktree>` = controller path.
- **Type consistency:** `RevisionBadge` takes `RevisionStatus` (cast at call sites); `DisciplineBadge` takes `Discipline`; `getTicketDetail` drawing embed is additive and read via a localized cast in the drawer.
- **Constraint check:** no deps/schema; revision rules + `reviewRevision` untouched; revision components reused; linked tickets use the unified drawer; `/tickets/[id]` page still works with the additive embed.
- **Note:** `DrawingFilters` keeps its own controls for now (drawing-specific); unifying it with the shared filter primitive is a later cleanup.
