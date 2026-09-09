# Slice 6 — Project Overview command center — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Make the project root (`/projects/[id]`) an Overview "command center" answering *what needs my attention now* (Work / Drawings / Site / Materials), and move the existing Work flow (table/kanban/filters/drawer/new-ticket) to `/projects/[id]/work`.

**Architecture:** Task 1 relocates the current root page verbatim to a new `work/page.tsx` and updates `lib/nav.ts` (Overview + Work links). Task 2 replaces the root page with the Overview: a server component running small aggregate queries and rendering `Section` cards (counts + deep links into filtered Work/Drawings/Site/Materials), with the domain-driven `computeHealth` signal.

**Tech Stack:** Next.js 15 RSC, Supabase, Tailwind. No new deps.

**Spec:** roadmap Slice 6 + §20 (health explains itself). Base: `feat/ux-foundation` (stacked on Slice 5). Decisions: root=Overview, Work→/work; sections = Work+Drawings+Site+Materials.

## Global Constraints
- No new deps, no schema changes. Reuse `Section`/`PageHeader`/`EmptyState`/badges/`HealthDot` + `computeHealth`/`lib/labels`.
- Move the Work flow **verbatim** (no behavior change) — same components, queries, filters, drawer, URLs (only the path prefix changes to `/work`).
- Overview is read-only aggregation; no new domain logic in the UI (reuse `computeHealth`).
- Deep links from Overview go to existing routes with existing params (e.g. `/projects/:id/work?priority=critical`).
- `projectNav` active-state: Overview href is project-root (`/projects/:id`) → the Slice-1 exact-match rule already prevents it lighting up on `/work` etc.

---

### Task 1: Move Work flow to `/projects/[id]/work` + nav

**Files:**
- Create: `app/(app)/projects/[id]/work/page.tsx`
- Modify: `lib/nav.ts`

**Interfaces:** none new; `projectNav` gains an Overview entry and points Work at `/work`.

- [ ] **Step 1: Create `app/(app)/projects/[id]/work/page.tsx`**

Copy the CURRENT contents of `app/(app)/projects/[id]/page.tsx` verbatim into this new file — it already uses `params.id` (works unchanged under the deeper route) and all its imports resolve the same. The only edit: rename the exported function to `ProjectWorkPage` (default export). Everything else (queries, filters, view switcher, table/kanban, drawer, new-ticket form, HierarchySidebar) stays identical.

(Do NOT change the root page in this task — it keeps working as-is until Task 2 replaces it. A temporary duplicate Work view at both routes is harmless and gone after Task 2.)

- [ ] **Step 2: Update `lib/nav.ts` `projectNav`**

```ts
export function projectNav(projectId: string): NavLink[] {
  return [
    { label: 'Overview', href: `/projects/${projectId}` },
    { label: 'Work', href: `/projects/${projectId}/work` },
    { label: 'Drawings', href: `/projects/${projectId}/drawings` },
    { label: 'Site', href: `/site` },
    { label: 'Materials', href: `/projects/${projectId}/materials` },
  ]
}
```

- [ ] **Step 3: Verify + commit**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.
Run: `cd "<worktree>" && npx vitest run` → green (33/33).

```bash
git add "app/(app)/projects/[id]/work/page.tsx" lib/nav.ts
git commit -m "feat(ui): move project work flow to /work; add Overview nav entry"
```

---

### Task 2: Overview command center at project root

**Files:**
- Modify (replace): `app/(app)/projects/[id]/page.tsx`

**Interfaces:** consumes `Section`, `PageHeader`, `HealthDot`, `computeHealth`/`HealthTicket` (`@/lib/health`), badges/labels. Produces the Overview page.

- [ ] **Step 1: Replace `app/(app)/projects/[id]/page.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { HealthDot } from '@/components/HealthDot'
import { computeHealth, type HealthTicket } from '@/lib/health'

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('name, code').eq('id', id).single()
  const { data: tickets } = await supabase
    .from('tickets')
    .select('type, status, priority, due_date')
    .eq('project_id', id)
  const { data: pendingRevs } = await supabase
    .from('drawing_revisions')
    .select('id, drawings!inner(project_id)')
    .eq('status', 'under_review')
    .eq('drawings.project_id', id)
  const { data: proposedMats } = await supabase
    .from('materials')
    .select('id')
    .eq('project_id', id)
    .eq('status', 'proposed')

  const today = new Date()
  const iso = today.toISOString().slice(0, 10)
  const list = (tickets as HealthTicket[]) ?? []
  const openish = (s: string) => s === 'open' || s === 'in_progress'
  const isOverdue = (t: HealthTicket) =>
    !!t.due_date && t.due_date < iso && !['closed', 'verified'].includes(t.status)

  const work = {
    open: list.filter((t) => t.type === 'task' && openish(t.status)).length,
    overdue: list.filter((t) => t.type === 'task' && isOverdue(t)).length,
    critical: list.filter((t) => t.type === 'task' && t.priority === 'critical' && openish(t.status)).length,
  }
  const site = {
    open: list.filter((t) => t.type === 'site_issue' && openish(t.status)).length,
    awaitingVerification: list.filter((t) => t.type === 'site_issue' && t.status === 'resolved').length,
  }
  const drawingsPending = (pendingRevs as { id: string }[] | null)?.length ?? 0
  const materialsPending = (proposedMats as { id: string }[] | null)?.length ?? 0
  const health = computeHealth(list, today)

  const stat = (n: number, label: string) => (
    <div className="flex items-baseline gap-1.5">
      <span className="font-heading text-lg font-semibold text-ink">{n}</span>
      <span className="text-xs text-ink-muted">{label}</span>
    </div>
  )

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={project?.name ?? 'Project'}
        meta={
          <>
            {project?.code && <span className="font-mono text-ink-faint">{project.code}</span>}
            <span className="inline-flex items-center gap-1.5">
              <HealthDot health={health} />
              <span className="capitalize">{health === 'red' ? 'At risk' : health === 'yellow' ? 'Needs attention' : 'On track'}</span>
            </span>
          </>
        }
        actions={
          <Link
            href={`/projects/${id}/work`}
            className="inline-flex h-9 items-center rounded bg-primary px-3.5 text-sm font-medium text-primary-fg hover:bg-primary-hover"
          >
            Open work
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Work" actions={<Link href={`/projects/${id}/work`} className="text-xs text-ink-muted hover:text-ink">View →</Link>}>
          <div className="flex flex-wrap gap-5 rounded-lg border border-subtle bg-surface p-4">
            {stat(work.open, 'open')}
            {stat(work.overdue, 'overdue')}
            {stat(work.critical, 'critical')}
          </div>
        </Section>

        <Section title="Drawings" actions={<Link href={`/projects/${id}/drawings`} className="text-xs text-ink-muted hover:text-ink">View →</Link>}>
          <div className="flex flex-wrap gap-5 rounded-lg border border-subtle bg-surface p-4">
            {stat(drawingsPending, 'awaiting approval')}
          </div>
        </Section>

        <Section title="Site issues" actions={<Link href={`/projects/${id}/work?ktype=site_issue&view=kanban`} className="text-xs text-ink-muted hover:text-ink">View →</Link>}>
          <div className="flex flex-wrap gap-5 rounded-lg border border-subtle bg-surface p-4">
            {stat(site.open, 'open')}
            {stat(site.awaitingVerification, 'awaiting verification')}
          </div>
        </Section>

        <Section title="Materials" actions={<Link href={`/projects/${id}/materials`} className="text-xs text-ink-muted hover:text-ink">View →</Link>}>
          <div className="flex flex-wrap gap-5 rounded-lg border border-subtle bg-surface p-4">
            {stat(materialsPending, 'pending decisions')}
          </div>
        </Section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean. (Note: the `drawing_revisions` join filter uses `drawings!inner(project_id)` + `.eq('drawings.project_id', id)`; if tsc/PostgREST typing rejects the inner-join filter, fall back to fetching `drawing_revisions(id, drawings(project_id))` without the `!inner` and count client-side where `project_id === id`. Report which form was used.)
Run: `cd "<worktree>" && npx vitest run` → green (33/33).
Manual (user, auth-gated): opening a project lands on the Overview with correct counts; health signal + label render; each "View →" deep-links into the right filtered view; "Open work" goes to `/work`; nav shows Overview active on root and Work active on `/work`.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/projects/[id]/page.tsx"
git commit -m "feat(ui): project overview command center (work/drawings/site/materials + health)"
```

---

## Self-Review notes
- **Spec coverage:** Overview at root (T2); Work moved to /work (T1); nav updated (T1); sections Work/Drawings/Site/Materials with counts + deep links (T2); domain-driven health via `computeHealth` (T2, §20).
- **Placeholder scan:** none. `<worktree>` = controller-supplied path. The one conditional is the documented PostgREST inner-join fallback (Step 2), with an explicit alternative — not a placeholder.
- **Type consistency:** `HealthTicket` fields (type/status/priority/due_date) match the Overview ticket select; counts are inline presentation, not new domain logic. `projectNav` (T1) Overview/Work hrefs align with the routes (root Overview, /work).
- **Constraint check:** no deps/schema; verbatim Work move (no behavior change); reuse of Section/PageHeader/HealthDot/computeHealth; read-only aggregation.
- **Risk:** the drawing-revisions-by-project query — Step 2 documents a client-count fallback if the embedded filter is awkward. Materials/`proposed` mirrors the existing workspace-dashboard pattern (safe read of the merged materials feature).
