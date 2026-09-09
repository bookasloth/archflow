# Slice 11 — Site evidence-first + PhotoMarker polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** For site issues, make before/after **evidence** the prominent part of the ticket drawer, surface the "verified needs an after-photo" gate as a helpful hint, and polish `PhotoMarker` (crisper numbered pins + a mark affordance). Do not weaken the domain rule.

**Architecture:** `PhotoMarker` gets styling-only polish (pins + crosshair cursor when editable). `TicketDrawer` reorders the site-issue branch so `BeforeAfter` + `AddPhoto` render right under the header (above status/description), and shows a hint when the issue is `resolved` with no after-photo. The verification rule stays enforced server-side (`canTransition`) — the hint is purely advisory.

**Tech Stack:** Next.js 15, React 19, Tailwind. No new deps.

**Spec:** roadmap Slice 11 / P2 (§14, §15). Base: `feat/ux-foundation` (stacked on Slice 10).

## Global Constraints
- No new deps, no schema change. Do NOT change the state machine or `changeStatus`/`canTransition` — the after-photo gate stays server-enforced; the drawer only *hints*.
- `PhotoMarker` change is styling-only: keep its props, `onChange`/`toNormalized` behavior, marker data shape, and the capture flows (`AddPhoto`, `SiteCapture`) working unchanged. Markers stay red (problem-spot semantics).
- `TicketDrawer` reorder affects only the site-issue branch ordering + an advisory hint; task tickets keep their current rendering; all drawer logic/effects/close/reload/focus unchanged.

---

### Task 1: PhotoMarker polish

**Files:**
- Modify: `components/PhotoMarker.tsx`

- [ ] **Step 1: Polish the pins + cursor (styling only)**

In `components/PhotoMarker.tsx`, keep all logic; update only classNames:
- Container: add a crosshair cursor when editable — change the wrapper className to:
  ```tsx
  className={`relative inline-block select-none ${editable ? 'cursor-crosshair' : ''}`}
  ```
- Pin: replace the marker `<span>` className with a fixed-size circular numbered pin:
  ```tsx
  className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-red-600 text-[10px] font-semibold leading-none text-white shadow"
  ```
Keep the `style={{ left, top }}`, `title`, and `{i + 1}` exactly as they are. Change nothing else.

- [ ] **Step 2: Verify + commit**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean. Run vitest → 33/33 (markers.test.ts still passes — logic untouched).

```bash
git add components/PhotoMarker.tsx
git commit -m "feat(ui): polish PhotoMarker pins + crosshair affordance"
```

---

### Task 2: Evidence-first ticket drawer for site issues

**Files:**
- Modify: `components/TicketDrawer.tsx`

- [ ] **Step 1: Reorder the site-issue branch to evidence-first + add the verify hint**

READ `components/TicketDrawer.tsx` first. Inside the `{detail && (...)}` block, restructure the body so the ORDER for a site issue is: header (unchanged) → **evidence (BeforeAfter + AddPhoto) + verify hint** → StatusControl → description → CommentThread. For a task, keep the current order: header → StatusControl → description → photo `<img>` list → CommentThread.

Concretely, compute near the existing `before`/`after`:
```tsx
const isSite = detail?.type === 'site_issue'
const needsAfterToVerify = isSite && detail?.status === 'resolved' && after.length === 0
```
Then arrange the JSX so the evidence block for site issues appears immediately AFTER the header/drawing-link and BEFORE `StatusControl`:
```tsx
{isSite && (
  <div className="space-y-3">
    <BeforeAfter
      before={before.map((p) => ({ url: p.url, markers: p.markers as Marker[] }))}
      after={after.map((p) => ({ url: p.url, markers: p.markers as Marker[] }))}
    />
    {needsAfterToVerify && (
      <p className="rounded border border-subtle bg-surface-hover px-2.5 py-1.5 text-xs text-ink-muted">
        Add an after-photo to verify this issue.
      </p>
    )}
    <AddPhoto ticketId={detail.id} projectId={detail.project_id} kind="after" />
  </div>
)}
```
Keep the existing `StatusControl` (with its `onChanged`) after the evidence block. Move the `{detail.description && <p>…</p>}` to render after `StatusControl` (or keep its position — but it must come AFTER the site evidence). Keep the task branch's `<img>` list exactly where it is for tasks only (guard it with `!isSite` if needed so it doesn't double-render). Keep `CommentThread` last. Do not touch the effects, close/reload/focus logic, or the header.

**Important:** ensure BeforeAfter/AddPhoto render ONCE for site issues (they currently live in the old `detail.type === 'site_issue' ? (...) : (...)` block — replace that block with the new evidence-first placement so there's no duplicate). The task `<img>` list stays for non-site tickets.

- [ ] **Step 2: Verify**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean. Run vitest → 33/33.
Manual (user, auth-gated): opening a site issue shows before/after evidence at the top; a `resolved` site issue with no after-photo shows the hint; adding an after-photo + verifying works (server still enforces the gate); task tickets are unchanged (status → description → images → comments); no duplicate evidence blocks.

- [ ] **Step 3: Commit**

```bash
git add components/TicketDrawer.tsx
git commit -m "feat(ui): evidence-first site-issue drawer + verify-gate hint"
```

---

## Self-Review notes
- **Spec coverage (§14/§15):** evidence prioritized for site issues (T2); verification gate surfaced as advisory hint, rule still server-enforced (T2); PhotoMarker polished (T1).
- **Placeholder scan:** none. `<worktree>` = controller path.
- **Constraint check:** no deps/schema; state machine + `canTransition` untouched; PhotoMarker props/logic + capture flows unchanged; drawer effects unchanged; evidence renders once (no duplicate).
- **Scope note:** the `/tickets/[id]` deep-link page keeps its current ordering (the drawer is the primary surface); reordering it too is a later cleanup if wanted.
- **Risk:** the drawer JSX reorder is the delicate part — the implementer must read the file and ensure BeforeAfter/AddPhoto render exactly once for site issues and the task `<img>` list only for tasks.
