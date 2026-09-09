# Slice 8 — Activity stream (derived) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Replace the `/activity` stub with a lightweight cross-project recent-activity feed **derived from existing rows** (no schema change): recent tickets, drawing revisions, materials, and comments — merged, sorted newest-first, each linking to the relevant object.

**Architecture:** A server component at `app/(app)/activity/page.tsx` runs four small `created_at`-ordered queries, maps each to a common `ActivityItem { id, when, text, href }`, merges + sorts by `when` desc, caps to ~30, and renders a simple list (text + date) reusing `PageHeader`/`EmptyState`.

**Tech Stack:** Next.js 15 RSC, Supabase, Tailwind. No new deps.

**Spec:** roadmap Slice 8 (P1) + §21. Base: `feat/ux-foundation` (stacked on Slice 7). Decision: derive from existing data (no `activity` table).

## Global Constraints
- No new deps, no schema change. Derivation only (no event log; approximate feed).
- Read-only; no writes into existing Server Actions.
- Reuse `PageHeader`/`EmptyState`, tokens, `lib/revision-status` (`formatRevision`, `revisionLabel` via `lib/labels`).
- Links go to existing routes: tickets/comments → `/projects/${pid}/work?ticket=${tid}`; revisions → `/projects/${pid}/drawings`; materials → `/projects/${pid}/materials`.

---

### Task 1: Derived Activity feed

**Files:**
- Modify (replace stub): `app/(app)/activity/page.tsx`

- [ ] **Step 1: Replace `app/(app)/activity/page.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatRevision } from '@/lib/revision-status'
import { revisionLabel } from '@/lib/labels'
import type { RevisionStatus } from '@/lib/revision-status'

type Item = { id: string; when: string; text: string; href: string }

export default async function ActivityPage() {
  const supabase = await createClient()

  const [tk, rv, mt, cm] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, seq, type, title, project_id, created_at')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('drawing_revisions')
      .select('id, revision_no, status, created_at, drawings(title, project_id)')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('materials')
      .select('id, name, status, project_id, created_at')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('comments')
      .select('id, created_at, ticket_id, profiles(full_name), tickets(seq, type, project_id)')
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const items: Item[] = []

  type Tk = { id: string; seq: number; type: string; title: string; project_id: string; created_at: string }
  for (const t of (tk.data as unknown as Tk[]) ?? []) {
    items.push({
      id: `t-${t.id}`,
      when: t.created_at,
      text: `New ${t.type === 'site_issue' ? 'SITE' : 'TASK'}-${t.seq} · ${t.title}`,
      href: `/projects/${t.project_id}/work?ticket=${t.id}`,
    })
  }

  type Rv = { id: string; revision_no: number; status: RevisionStatus; created_at: string; drawings: { title: string; project_id: string } | null }
  for (const r of (rv.data as unknown as Rv[]) ?? []) {
    if (!r.drawings) continue
    items.push({
      id: `r-${r.id}`,
      when: r.created_at,
      text: `${formatRevision(r.revision_no)} on ${r.drawings.title} · ${revisionLabel(r.status)}`,
      href: `/projects/${r.drawings.project_id}/drawings`,
    })
  }

  type Mt = { id: string; name: string; status: string; project_id: string; created_at: string }
  for (const m of (mt.data as unknown as Mt[]) ?? []) {
    items.push({
      id: `m-${m.id}`,
      when: m.created_at,
      text: `Material ${m.name} · ${m.status.replace(/_/g, ' ')}`,
      href: `/projects/${m.project_id}/materials`,
    })
  }

  type Cm = { id: string; created_at: string; ticket_id: string; profiles: { full_name: string | null } | null; tickets: { seq: number; type: string; project_id: string } | null }
  for (const c of (cm.data as unknown as Cm[]) ?? []) {
    if (!c.tickets) continue
    const who = c.profiles?.full_name ?? 'Someone'
    items.push({
      id: `c-${c.id}`,
      when: c.created_at,
      text: `${who} commented on ${c.tickets.type === 'site_issue' ? 'SITE' : 'TASK'}-${c.tickets.seq}`,
      href: `/projects/${c.tickets.project_id}/work?ticket=${c.ticket_id}`,
    })
  }

  items.sort((a, b) => (a.when < b.when ? 1 : a.when > b.when ? -1 : 0))
  const recent = items.slice(0, 30)

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Activity" meta={<span>Recent updates across your projects</span>} />
      {recent.length === 0 ? (
        <EmptyState title="No recent activity" description="Tickets, revisions, comments and material updates will appear here as work happens." />
      ) : (
        <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
          {recent.map((it) => (
            <li key={it.id} className="hover:bg-surface-hover">
              <Link href={it.href} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                <span className="truncate text-ink">{it.text}</span>
                <span className="shrink-0 text-xs text-ink-faint">{it.when.slice(0, 10)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean. (If the `drawings(...)`/`tickets(...)`/`profiles(...)` embeds type as arrays rather than objects, adjust the local `Rv`/`Cm` types to match what tsc infers — keep the `as unknown as` casts; report any adjustment.)
Run: `cd "<worktree>" && npx vitest run` → green (33/33).
Manual (user, auth-gated): `/activity` shows a merged newest-first feed with dates; each row links to the right object; empty state when there's nothing; sidebar "Activity" active here.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/activity/page.tsx"
git commit -m "feat(ui): derived cross-project activity feed"
```

---

## Self-Review notes
- **Spec coverage:** derived activity from tickets/revisions/materials/comments (§21); newest-first, capped; deep links to existing routes. No schema per the approved decision.
- **Placeholder scan:** none. `<worktree>` = controller-supplied path. Step 2 embed-shape note has a concrete fallback (adjust local types), not a placeholder.
- **Type consistency:** local `Tk/Rv/Cm/Mt` types describe the embed shapes; `revisionLabel`/`formatRevision` reused; `RevisionStatus` from `lib/revision-status`.
- **Constraint check:** no deps/schema; read-only (parallel selects); reuses primitives; links to existing routes.
- **Note:** approximate feed by design (created_at + current status; no true transition events) — acceptable per the "derive" decision; a real event table is a later option if needed.
