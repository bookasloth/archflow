# Slice 2 — Core Primitives (badges, layout) + adoption — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the meaning-badge system (status/priority/discipline/approval/health) and layout primitives (PageHeader/Section/EmptyState), then adopt them on the ticket list, ticket detail, and Kanban card so raw-text metadata becomes consistent chips — proving the design system in real screens.

**Architecture:** Presentational components in `components/ui/` consuming the Slice-1 tokens via **literal Tailwind class maps** (never dynamically-built class strings — Tailwind purges those). A small `lib/labels.ts` provides human-readable labels for enum values (tested). Adoption edits three existing ticket screens only.

**Tech Stack:** Next.js 15, React 19, Tailwind 3, Vitest. No new deps.

**Spec:** `docs/superpowers/specs/2026-09-09-ux-foundation-audit-and-roadmap.md` (P0 Slice 2). Base: `feat/ux-foundation` (stacked on Slice 1).

## Global Constraints
- **No new npm dependencies. No DB schema changes.**
- **Domain values are authoritative** (`lib/status.ts`, `lib/health.ts` Priority, `lib/revision-status.ts` RevisionStatus, discipline enum). Labels/colors are presentation only — never change transition rules or enum values.
- **Tailwind purge safety:** badge components MUST map each enum value to a **complete literal class string** in a `Record` (e.g. `open: 'bg-status-open-soft text-status-open-fg'`). Do NOT build class names by interpolation.
- Adoption edits ONLY: `components/TicketList.tsx`, `app/(app)/tickets/[id]/page.tsx`, `components/TicketCard.tsx`. Do not touch other screens, Server Actions, or domain modules.
- Reuse existing `HealthDot` for health; do not duplicate it.
- Keep the lean stack; badges/layout are pure presentational (client not required unless a component needs interactivity — these don't; keep them server-compatible, no `'use client'` unless needed).
- **Defer form primitives (Input/Select/Field) to the slice that first uses them** (Slice 5 filters) — YAGNI; not built here.

---

### Task 1: Meaning badges + labels + missing approval tokens

**Files:**
- Create: `lib/labels.ts`
- Test: `tests/labels.test.ts`
- Modify: `app/globals.css` (add 3 approval tokens)
- Modify: `tailwind.config.ts` (add 3 approval token keys)
- Create: `components/ui/Badge.tsx`

**Interfaces produced (consumed by Task 3 + later slices):**
- `lib/labels.ts`: `statusLabel(s: TicketStatus): string`, `priorityLabel(p: Priority): string`, `disciplineLabel(d: Discipline): string`, `revisionLabel(s: RevisionStatus): string`. `Discipline` type exported here (union of the 10 values) if not already exported elsewhere.
- `components/ui/Badge.tsx`: `Badge({ className?, children })` (base pill), and `StatusBadge({ status })`, `PriorityBadge({ priority })`, `DisciplineBadge({ discipline })`, `RevisionBadge({ status })`.

- [ ] **Step 1: Write the failing test** `tests/labels.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { statusLabel, priorityLabel, disciplineLabel, revisionLabel } from '@/lib/labels'

describe('labels', () => {
  it('humanizes ticket status', () => {
    expect(statusLabel('in_progress')).toBe('In progress')
    expect(statusLabel('open')).toBe('Open')
  })
  it('humanizes priority', () => {
    expect(priorityLabel('critical')).toBe('Critical')
  })
  it('humanizes discipline with multi-word cases', () => {
    expect(disciplineLabel('fire_safety')).toBe('Fire safety')
    expect(disciplineLabel('client_coordination')).toBe('Client coordination')
  })
  it('humanizes revision status', () => {
    expect(revisionLabel('approved_with_comments')).toBe('Approved with comments')
    expect(revisionLabel('changes_requested')).toBe('Changes requested')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd "<worktree>" && npx vitest run tests/labels.test.ts` → FAIL (module not found).

- [ ] **Step 3: Write `lib/labels.ts`**

```ts
import type { TicketStatus } from '@/lib/status'
import type { Priority } from '@/lib/health'
import type { RevisionStatus } from '@/lib/revision-status'

export type Discipline =
  | 'architectural' | 'structural' | 'electrical' | 'plumbing' | 'fire_safety'
  | 'interior' | 'landscape' | 'construction' | 'documentation' | 'client_coordination'

const STATUS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  verified: 'Verified',
  closed: 'Closed',
}
const PRIORITY: Record<Priority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
}
const DISCIPLINE: Record<Discipline, string> = {
  architectural: 'Architectural', structural: 'Structural', electrical: 'Electrical',
  plumbing: 'Plumbing', fire_safety: 'Fire safety', interior: 'Interior',
  landscape: 'Landscape', construction: 'Construction', documentation: 'Documentation',
  client_coordination: 'Client coordination',
}
const REVISION: Record<RevisionStatus, string> = {
  draft: 'Draft', under_review: 'Under review', approved: 'Approved',
  approved_with_comments: 'Approved with comments', changes_requested: 'Changes requested',
  rejected: 'Rejected', superseded: 'Superseded',
}

export const statusLabel = (s: TicketStatus) => STATUS[s]
export const priorityLabel = (p: Priority) => PRIORITY[p]
export const disciplineLabel = (d: Discipline) => DISCIPLINE[d]
export const revisionLabel = (s: RevisionStatus) => REVISION[s]
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd "<worktree>" && npx vitest run tests/labels.test.ts` → PASS.

- [ ] **Step 5: Add the 3 missing approval tokens** to `app/globals.css` (`:root`, near the existing `--approval-*`):

```css
  --approval-approved_with_comments-soft: #E6F4EA; --approval-approved_with_comments-fg: #15803D;
  --approval-changes_requested-soft: #FBF0DD;     --approval-changes_requested-fg: #B45309;
  --approval-rejected-soft: #FBE7E7;              --approval-rejected-fg: #B91C1C;
```

And in `tailwind.config.ts`, extend the existing `approval` color object with:

```ts
        'approved_with_comments': { soft: 'var(--approval-approved_with_comments-soft)', fg: 'var(--approval-approved_with_comments-fg)' },
        'changes_requested': { soft: 'var(--approval-changes_requested-soft)', fg: 'var(--approval-changes_requested-fg)' },
        'rejected': { soft: 'var(--approval-rejected-soft)', fg: 'var(--approval-rejected-fg)' },
```

- [ ] **Step 6: Write `components/ui/Badge.tsx`** (literal class maps — purge-safe)

```tsx
import type { ReactNode } from 'react'
import type { TicketStatus } from '@/lib/status'
import type { Priority } from '@/lib/health'
import type { RevisionStatus } from '@/lib/revision-status'
import { statusLabel, priorityLabel, disciplineLabel, revisionLabel, type Discipline } from '@/lib/labels'

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  )
}

// Full literal class strings so Tailwind's content scanner keeps them (never interpolate).
const STATUS_CLS: Record<TicketStatus, string> = {
  open: 'bg-status-open-soft text-status-open-fg',
  in_progress: 'bg-status-in_progress-soft text-status-in_progress-fg',
  resolved: 'bg-status-resolved-soft text-status-resolved-fg',
  verified: 'bg-status-verified-soft text-status-verified-fg',
  closed: 'bg-status-closed-soft text-status-closed-fg',
}
export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={STATUS_CLS[status]}>{statusLabel(status)}</Badge>
}

const PRIORITY_CLS: Record<Priority, string> = {
  low: 'bg-priority-low-soft text-priority-low-fg',
  medium: 'bg-priority-medium-soft text-priority-medium-fg',
  high: 'bg-priority-high-soft text-priority-high-fg',
  critical: 'bg-priority-critical-soft text-priority-critical-fg',
}
export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={PRIORITY_CLS[priority]}>{priorityLabel(priority)}</Badge>
}

const DISCIPLINE_DOT: Record<Discipline, string> = {
  architectural: 'bg-discipline-architectural',
  structural: 'bg-discipline-structural',
  electrical: 'bg-discipline-electrical',
  plumbing: 'bg-discipline-plumbing',
  fire_safety: 'bg-discipline-fire_safety',
  interior: 'bg-discipline-interior',
  landscape: 'bg-discipline-landscape',
  construction: 'bg-discipline-construction',
  documentation: 'bg-discipline-documentation',
  client_coordination: 'bg-discipline-client_coordination',
}
export function DisciplineBadge({ discipline }: { discipline: Discipline }) {
  return (
    <Badge className="bg-surface-hover text-ink-muted">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${DISCIPLINE_DOT[discipline]}`} />
      {disciplineLabel(discipline)}
    </Badge>
  )
}

const REVISION_CLS: Record<RevisionStatus, string> = {
  draft: 'bg-approval-draft-soft text-approval-draft-fg',
  under_review: 'bg-approval-under_review-soft text-approval-under_review-fg',
  approved: 'bg-approval-approved-soft text-approval-approved-fg',
  approved_with_comments: 'bg-approval-approved_with_comments-soft text-approval-approved_with_comments-fg',
  changes_requested: 'bg-approval-changes_requested-soft text-approval-changes_requested-fg',
  rejected: 'bg-approval-rejected-soft text-approval-rejected-fg',
  superseded: 'bg-approval-superseded-soft text-approval-superseded-fg',
}
export function RevisionBadge({ status }: { status: RevisionStatus }) {
  return <Badge className={REVISION_CLS[status]}>{revisionLabel(status)}</Badge>
}
```

- [ ] **Step 7: Verify + commit**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.
Run: `cd "<worktree>" && npx vitest run` → green (30/30 with the new labels test).

```bash
git add lib/labels.ts tests/labels.test.ts app/globals.css tailwind.config.ts components/ui/Badge.tsx
git commit -m "feat(ui): meaning badges (status/priority/discipline/revision) + labels + approval tokens"
```

---

### Task 2: Layout primitives — PageHeader, Section, EmptyState

**Files:**
- Create: `components/ui/PageHeader.tsx`
- Create: `components/ui/Section.tsx`
- Create: `components/ui/EmptyState.tsx`

**Interfaces produced:**
- `PageHeader({ title, meta?, actions?, children? })` — page title (font-heading), optional meta row (nodes), optional right-aligned actions.
- `Section({ title, actions?, children })` — a titled content block with a section heading.
- `EmptyState({ title, description?, action? })` — centered empty state (title, helpful description, optional action node).

- [ ] **Step 1: Create `components/ui/PageHeader.tsx`**

```tsx
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  meta,
  actions,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold text-ink">{title}</h1>
          {meta && <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/ui/Section.tsx`**

```tsx
import type { ReactNode } from 'react'

export function Section({
  title,
  actions,
  children,
}: {
  title: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-ink">{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}
```

- [ ] **Step 3: Create `components/ui/EmptyState.tsx`**

```tsx
import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Verify + commit**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.

```bash
git add components/ui/PageHeader.tsx components/ui/Section.tsx components/ui/EmptyState.tsx
git commit -m "feat(ui): layout primitives (PageHeader, Section, EmptyState)"
```

---

### Task 3: Adopt primitives on ticket screens

**Files:**
- Modify: `components/TicketList.tsx`
- Modify: `components/TicketCard.tsx`
- Modify: `app/(app)/tickets/[id]/page.tsx`

**Interfaces consumed:** `StatusBadge`/`PriorityBadge`/`DisciplineBadge` (Task 1), `PageHeader`/`EmptyState` (Task 2), `disciplineLabel` etc.

**Rules:** Replace raw-text status/priority/discipline with badges. Do NOT change data fetching, props shape, links, or behavior — presentation only. Cast enum strings to the badge prop types where the row type currently uses `string` (the values are guaranteed by the DB enums; a cast is acceptable and matches existing `as never` patterns).

- [ ] **Step 1: `components/TicketList.tsx`** — badges + EmptyState

Replace the raw metadata spans and the "No tickets yet." text. Keep it a `<ul>` (table uplift is Slice 4). Target result:

```tsx
import Link from 'next/link'
import { StatusBadge, PriorityBadge, DisciplineBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { TicketStatus } from '@/lib/status'
import type { Priority } from '@/lib/health'
import type { Discipline } from '@/lib/labels'

type Row = {
  id: string
  seq: number
  type: string
  discipline: string
  title: string
  status: string
  priority: string
  due_date: string | null
}

export function TicketList({ tickets }: { tickets: Row[] }) {
  if (tickets.length === 0)
    return <EmptyState title="No tickets yet" description="Work items you create for this project will appear here." />
  return (
    <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
      {tickets.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 p-2.5 text-sm hover:bg-surface-hover">
          <Link href={`/tickets/${t.id}`} className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-xs text-ink-faint">
              {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
            </span>
            <span className="truncate text-ink">{t.title}</span>
          </Link>
          <span className="flex shrink-0 items-center gap-2">
            <DisciplineBadge discipline={t.discipline as Discipline} />
            <PriorityBadge priority={t.priority as Priority} />
            <StatusBadge status={t.status as TicketStatus} />
          </span>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: `components/TicketCard.tsx`** — badges for priority + discipline

In the existing card, replace the raw `{ticket.priority}` text and the raw `{ticket.discipline}` text with `<PriorityBadge priority={ticket.priority as Priority} />` and `<DisciplineBadge discipline={ticket.discipline as Discipline} />`. Keep the seq badge, title, assignee, due date, drag/click handlers exactly as they are. Add the imports:

```tsx
import { PriorityBadge, DisciplineBadge } from '@/components/ui/Badge'
import type { Priority } from '@/lib/health'
import type { Discipline } from '@/lib/labels'
```

(The card's `status` is already conveyed by its column, so no StatusBadge on the card — keep it compact per the design principle.)

- [ ] **Step 3: `app/(app)/tickets/[id]/page.tsx`** — PageHeader + badges in the header block

Replace the hand-rolled title/meta header block (the `<div>` with the seq, `<h1>`, and the discipline/priority/due spans) with `PageHeader`, and render discipline/priority/status as badges in its `meta`. Keep everything else (description, StatusControl, photos, CommentThread) unchanged. Example header:

```tsx
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge, PriorityBadge, DisciplineBadge } from '@/components/ui/Badge'
import type { Priority } from '@/lib/health'
import type { Discipline } from '@/lib/labels'
// ... existing imports ...

// in JSX, replacing the old header div:
<PageHeader
  title={t.title}
  meta={
    <>
      <span className="font-mono text-ink-faint">
        {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
      </span>
      <DisciplineBadge discipline={t.discipline as Discipline} />
      <PriorityBadge priority={t.priority as Priority} />
      <StatusBadge status={t.status as TicketStatus} />
      {t.due_date && <span>due {t.due_date}</span>}
    </>
  }
/>
```

Keep the `t.drawing_id` linked-drawing line below the header if present (or fold into `meta`). Do not change the data query or the rest of the page.

- [ ] **Step 4: Verify**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.
Run: `cd "<worktree>" && npx vitest run` → green.
Manual (controller/user, auth-gated): ticket list shows discipline/priority/status chips + empty state; Kanban cards show priority/discipline chips; ticket detail header uses PageHeader with chips; no behavior/nav regressions.

- [ ] **Step 5: Commit**

```bash
git add components/TicketList.tsx components/TicketCard.tsx "app/(app)/tickets/[id]/page.tsx"
git commit -m "feat(ui): adopt badges + PageHeader/EmptyState on ticket list, card, detail"
```

---

## Self-Review notes
- **Spec coverage:** badges for status/priority/discipline/approval → T1; health via existing HealthDot (reused, not duplicated); PageHeader/Section/EmptyState → T2; adoption proof on 3 screens → T3. Form primitives (Input/Select/Field) deferred to Slice 5 (first consumer) per YAGNI — noted in constraints.
- **Placeholder scan:** none. `<worktree>` = the path the controller passes to subagents.
- **Purge safety:** every badge uses a literal `Record<Value, string>` of complete class strings; no interpolated class names — called out in Global Constraints and each map.
- **Type consistency:** `Discipline` defined in `lib/labels.ts`, consumed by Badge (T1) and adoption (T3). `Priority` from `lib/health.ts`, `TicketStatus` from `lib/status.ts`, `RevisionStatus` from `lib/revision-status.ts` — all existing. Approval tokens extended to the full 7-value `RevisionStatus` set (T1 Step 5) so `RevisionBadge` is exhaustive.
- **Constraint check:** no deps, no schema, no domain-rule changes; adoption is presentation-only on 3 named files; new label logic is tested.
