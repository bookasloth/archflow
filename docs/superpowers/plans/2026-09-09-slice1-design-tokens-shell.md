# Slice 1 — Design Tokens + App Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Establish the Archflow design system (tokens + fonts) and a collapsible workspace app shell that every later slice reuses — without changing any domain logic or existing page bodies.

**Architecture:** CSS-variable design tokens in `globals.css`, mapped into Tailwind `theme.extend` (so `bg-surface`, `text-ink-muted`, `bg-primary`, `font-heading` work). Fonts self-hosted via `next/font/google`. A client `Sidebar` (collapsible, `localStorage`, active-state from `usePathname`, project context) inside a rewritten `app/(app)/layout.tsx`. Small shell primitives (Button/IconButton/SidebarNavItem/Breadcrumb/ComingSoon). Stub routes for not-yet-built nav targets.

**Tech Stack:** Next.js 15 (RSC + Server Actions), React 19, Tailwind 3, `next/font/google`. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-09-09-ux-foundation-audit-and-roadmap.md` (§4, decisions in §5).

## Global Constraints
- **No new npm dependencies.** `next/font/google` ships with Next — not a dependency.
- **No DB schema changes. No domain-logic changes** → no new domain tests required in this slice (a pure `lib/nav.ts` config is data, not domain logic; no test needed).
- **Do not modify** any existing page body, component, Server Action, `lib/` domain module, or test. Only the files each task names.
- **Preserve existing color utilities:** map tokens via `theme.extend` (additive) so existing `bg-blue-500`, `bg-gray-50`, etc. (used by Kanban/others) keep working.
- **80–90% neutral; color only for meaning.** Brand **primary = orange** on buttons only.
- **Fonts:** Plus Jakarta Sans (headings) + Poppins (body), via `--font-heading`/`--font-body`.
- Token color key for text is **`ink`** (not `text`) to avoid the awkward `text-text` utility.

---

### Task 1: Design tokens + fonts

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`

**Interfaces produced (consumed by Tasks 2–3 and all later slices):**
- Tailwind utilities: `bg-bg`, `bg-surface`, `bg-surface-hover`, `border-subtle`, `border-line`, `text-ink`, `text-ink-muted`, `text-ink-faint`, `bg-primary`, `hover:bg-primary-hover`, `text-primary-fg`, `bg-primary-soft`, `text-primary`, plus meaning tokens `bg-status-*-soft`/`text-status-*`, `*-priority-*`, `*-approval-*`, `*-discipline-*` (see values below), `font-heading`, `font-body`, `rounded` (6px), `rounded-lg` (10px), `shadow-sm`.
- CSS variables on `:root` for every token above.

- [ ] **Step 1: Write `app/globals.css`** (replace entire file)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* neutral ground */
  --bg: #FBFBFA;
  --surface: #FFFFFF;
  --surface-hover: #F5F5F4;
  --border-subtle: #EAEAE8;
  --border-line: #DDDDDA;
  --ink: #1A1A19;
  --ink-muted: #6B6B68;
  --ink-faint: #9A9A96;
  --focus: #3B82F6;

  /* brand primary — orange (buttons only) */
  --primary: #E8590C;
  --primary-hover: #D24E08;
  --primary-active: #B84406;
  --primary-fg: #FFFFFF;
  --primary-soft: rgba(232, 89, 12, 0.10);

  /* status (mirrors lib/status.ts / ticket-colors.ts) — soft bg + readable fg */
  --status-open-soft: #EEF1F4;         --status-open-fg: #475569;
  --status-in_progress-soft: #E7EEFB;  --status-in_progress-fg: #1D4ED8;
  --status-resolved-soft: #FBF0DD;     --status-resolved-fg: #B45309;
  --status-verified-soft: #F1EBFB;     --status-verified-fg: #6D28D9;
  --status-closed-soft: #E6F4EA;       --status-closed-fg: #15803D;

  /* priority */
  --priority-low-soft: #EEF1F4;        --priority-low-fg: #475569;
  --priority-medium-soft: #F1F1EF;     --priority-medium-fg: #57534E;
  --priority-high-soft: #FBF0DD;       --priority-high-fg: #B45309;
  --priority-critical-soft: #FBE7E7;   --priority-critical-fg: #B91C1C;

  /* approval / revision (mirrors lib/revision-status.ts) */
  --approval-draft-soft: #F1F1EF;         --approval-draft-fg: #57534E;
  --approval-under_review-soft: #FBF0DD;  --approval-under_review-fg: #B45309;
  --approval-approved-soft: #E6F4EA;      --approval-approved-fg: #15803D;
  --approval-superseded-soft: #F1F1EF;    --approval-superseded-fg: #9A9A96;

  /* health (mirrors lib/health.ts) */
  --health-green: #15803D;
  --health-yellow: #B45309;
  --health-red: #B91C1C;

  --radius: 6px;
  --radius-lg: 10px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06);
}

body {
  background: var(--bg);
  color: var(--ink);
}
```

**Discipline hues** are many (10) and only needed by Slice 2 badges; define them as tokens now to keep the catalogue in one place. Append to `:root` before the closing brace:

```css
  /* discipline (muted, distinct — for small dot/label, not full backgrounds) */
  --discipline-architectural: #6366F1;
  --discipline-structural: #0EA5E9;
  --discipline-electrical: #F59E0B;
  --discipline-plumbing: #14B8A6;
  --discipline-fire_safety: #EF4444;
  --discipline-interior: #EC4899;
  --discipline-landscape: #22C55E;
  --discipline-construction: #A16207;
  --discipline-documentation: #64748B;
  --discipline-client_coordination: #8B5CF6;
```

- [ ] **Step 2: Update `tailwind.config.ts`** (additive `extend`, keeps default palette)

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', hover: 'var(--surface-hover)' },
        subtle: 'var(--border-subtle)',
        line: 'var(--border-line)',
        ink: { DEFAULT: 'var(--ink)', muted: 'var(--ink-muted)', faint: 'var(--ink-faint)' },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          active: 'var(--primary-active)',
          fg: 'var(--primary-fg)',
          soft: 'var(--primary-soft)',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: 'var(--radius)', lg: 'var(--radius-lg)' },
      boxShadow: { sm: 'var(--shadow-sm)' },
      borderColor: { DEFAULT: 'var(--border-line)' },
    },
  },
  plugins: [],
} satisfies Config
```

Note: `border-subtle` utility = `border-subtle` (from the `subtle` color) and `border-line` from `line`. Existing code using `border` (no color) now resolves to `--border-line` via `borderColor.DEFAULT` — visually near-identical to the old gray, acceptable.

- [ ] **Step 3: Wire fonts in `app/layout.tsx`** (replace file)

```tsx
import './globals.css'
import { Plus_Jakarta_Sans, Poppins } from 'next/font/google'

const heading = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
})
const body = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata = {
  title: 'Archflow',
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.
Run: `cd "<worktree>" && npx next build` is heavy; instead confirm the dev server compiles the root without type errors via tsc, and that `next/font` imports resolve (tsc catches bad imports). Also run `npx vitest run` → still green (unchanged; sanity).

- [ ] **Step 5: Commit**

```bash
git add app/globals.css tailwind.config.ts app/layout.tsx
git commit -m "feat(ui): design tokens + brand fonts (Jakarta/Poppins), orange primary"
```

---

### Task 2: Shell primitives

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/IconButton.tsx`
- Create: `components/ui/SidebarNavItem.tsx`
- Create: `components/ui/Breadcrumb.tsx`
- Create: `components/ui/ComingSoon.tsx`

**Interfaces produced (consumed by Task 3):**
- `Button({ variant?: 'primary' | 'ghost' | 'subtle', size?: 'sm' | 'md', ...buttonProps })`
- `IconButton({ label: string, ...buttonProps })` (icon passed as children; `aria-label` from `label`)
- `SidebarNavItem({ href, label, icon?, active, collapsed })`
- `Breadcrumb({ items: { label: string, href?: string }[] })`
- `ComingSoon({ title, description? })`

- [ ] **Step 1: Create `components/ui/Button.tsx`**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'subtle'
type Size = 'sm' | 'md'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active',
  ghost: 'text-ink hover:bg-primary-soft hover:text-primary',
  subtle: 'bg-surface text-ink border border-subtle hover:bg-surface-hover',
}
const SIZE: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = 'subtle', size = 'md', className = '', ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-50 disabled:pointer-events-none ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    />
  )
})
```

- [ ] **Step 2: Create `components/ui/IconButton.tsx`**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react'

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(function IconButton({ label, className = '', children, ...props }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})
```

- [ ] **Step 3: Create `components/ui/SidebarNavItem.tsx`**

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'

export function SidebarNavItem({
  href,
  label,
  icon,
  active,
  collapsed,
}: {
  href: string
  label: string
  icon?: ReactNode
  active: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-primary-soft text-primary font-medium'
          : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
      } ${collapsed ? 'justify-center px-0' : ''}`}
    >
      {icon && <span className="shrink-0 text-ink-faint">{icon}</span>}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}
```

- [ ] **Step 4: Create `components/ui/Breadcrumb.tsx`**

```tsx
import Link from 'next/link'
import { Fragment } from 'react'

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted">
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-ink-faint">/</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-ink">{it.label}</Link>
          ) : (
            <span className="text-ink">{it.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
```

- [ ] **Step 5: Create `components/ui/ComingSoon.tsx`**

```tsx
export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="font-heading text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {description ?? 'This area is part of the Archflow roadmap and is coming soon.'}
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Verify + commit**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.

```bash
git add components/ui/Button.tsx components/ui/IconButton.tsx components/ui/SidebarNavItem.tsx components/ui/Breadcrumb.tsx components/ui/ComingSoon.tsx
git commit -m "feat(ui): shell primitives (Button, IconButton, SidebarNavItem, Breadcrumb, ComingSoon)"
```

---

### Task 3: App shell (sidebar + layout) + stub routes

**Files:**
- Create: `lib/nav.ts` (nav config — data only)
- Create: `components/Sidebar.tsx` (client)
- Modify: `app/(app)/layout.tsx`
- Create: `app/(app)/my-work/page.tsx`
- Create: `app/(app)/reports/page.tsx`
- Create: `app/(app)/activity/page.tsx`

**Interfaces consumed:** primitives from Task 2; tokens from Task 1; `createClient` from `@/lib/supabase/client` (browser) for the project name.

**Nav mapping (honest to current routes):**
- Workspace: **Overview** → `/`; **My Work** → `/my-work` (stub).
- Current Project (only when path matches `/projects/:id...`): **Work** → `/projects/:id`; **Drawings** → `/projects/:id/drawings`; **Site** → `/site`; **Materials** → `/projects/:id/materials`.
- Management: **Reports** → `/reports` (stub); **Activity** → `/activity` (stub).
- (Project Structure live tree is deferred to Slice 9; the project page still renders `HierarchySidebar` as today.)

- [ ] **Step 1: Create `lib/nav.ts`**

```ts
export type NavLink = { label: string; href: string }

export const workspaceNav: NavLink[] = [
  { label: 'Overview', href: '/' },
  { label: 'My Work', href: '/my-work' },
]

export const managementNav: NavLink[] = [
  { label: 'Reports', href: '/reports' },
  { label: 'Activity', href: '/activity' },
]

export function projectNav(projectId: string): NavLink[] {
  return [
    { label: 'Work', href: `/projects/${projectId}` },
    { label: 'Drawings', href: `/projects/${projectId}/drawings` },
    { label: 'Site', href: `/site` },
    { label: 'Materials', href: `/projects/${projectId}/materials` },
  ]
}

// Extract the active project id from a pathname like /projects/<id>/...
export function projectIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/projects\/([^/]+)/)
  return m ? m[1] : null
}
```

- [ ] **Step 2: Create `components/Sidebar.tsx`** (client — collapse + active + project context)

```tsx
'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SidebarNavItem } from '@/components/ui/SidebarNavItem'
import { IconButton } from '@/components/ui/IconButton'
import { workspaceNav, managementNav, projectNav, projectIdFromPath } from '@/lib/nav'

const KEY = 'archflow.sidebar.collapsed'

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [projectName, setProjectName] = useState<string | null>(null)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(KEY) === '1')
    } catch {}
  }, [])
  function toggle() {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem(KEY, next ? '1' : '0') } catch {}
      return next
    })
  }

  const projectId = projectIdFromPath(pathname)

  useEffect(() => {
    if (!projectId) { setProjectName(null); return }
    let alive = true
    createClient()
      .from('projects').select('name').eq('id', projectId).single()
      .then(({ data }) => { if (alive) setProjectName(data?.name ?? null) })
    return () => { alive = false }
  }, [projectId])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-subtle bg-surface transition-[width] ${
        collapsed ? 'w-14' : 'w-60'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3">
        {!collapsed && <span className="font-heading text-base font-semibold text-ink">Archflow</span>}
        <IconButton label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggle}>
          <span aria-hidden>{collapsed ? '»' : '«'}</span>
        </IconButton>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <Section label="Workspace" collapsed={collapsed}>
          {workspaceNav.map((n) => (
            <SidebarNavItem key={n.href} href={n.href} label={n.label} active={isActive(n.href)} collapsed={collapsed} />
          ))}
        </Section>

        {projectId && (
          <Section label={projectName ?? 'Current Project'} collapsed={collapsed}>
            {projectNav(projectId).map((n) => (
              <SidebarNavItem key={n.label} href={n.href} label={n.label} active={isActive(n.href)} collapsed={collapsed} />
            ))}
          </Section>
        )}

        <Section label="Management" collapsed={collapsed}>
          {managementNav.map((n) => (
            <SidebarNavItem key={n.href} href={n.href} label={n.label} active={isActive(n.href)} collapsed={collapsed} />
          ))}
        </Section>
      </nav>
    </aside>
  )
}

function Section({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {!collapsed && (
        <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint truncate">
          {label}
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `app/(app)/layout.tsx`** (server — auth gate kept, adds shell)

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-subtle bg-surface px-5 py-2.5">
          <div className="text-sm text-ink-faint">
            {/* Breadcrumb + global search land in later slices */}
            <span className="text-ink-muted">Search coming soon</span>
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-ink-muted hover:text-ink">Sign out</button>
          </form>
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

Note: existing page bodies render unchanged inside `<main>`; they inherit tokens (bg/ink) but keep their own markup until later slices. The project page still renders its own `HierarchySidebar`.

- [ ] **Step 4: Create the three stub routes**

`app/(app)/my-work/page.tsx`:
```tsx
import { ComingSoon } from '@/components/ui/ComingSoon'
export default function MyWorkPage() {
  return <ComingSoon title="My Work" description="Your assigned, due, and overdue work across every project — arriving in an upcoming slice." />
}
```

`app/(app)/reports/page.tsx`:
```tsx
import { ComingSoon } from '@/components/ui/ComingSoon'
export default function ReportsPage() {
  return <ComingSoon title="Reports" description="Project and portfolio reporting is on the Archflow roadmap." />
}
```

`app/(app)/activity/page.tsx`:
```tsx
import { ComingSoon } from '@/components/ui/ComingSoon'
export default function ActivityPage() {
  return <ComingSoon title="Activity" description="A project activity stream is on the Archflow roadmap." />
}
```

- [ ] **Step 5: Verify**

Run: `cd "<worktree>" && npx tsc --noEmit` → clean.
Run: `cd "<worktree>" && npx vitest run` → still green.
Manual (controller does this; auth-gated): sidebar renders, collapse/expand persists across reload, active item highlights, Current Project section appears with the project name on a `/projects/:id` route, stub routes show ComingSoon, existing pages still render inside the shell with no regression.

- [ ] **Step 6: Commit**

```bash
git add lib/nav.ts components/Sidebar.tsx "app/(app)/layout.tsx" "app/(app)/my-work/page.tsx" "app/(app)/reports/page.tsx" "app/(app)/activity/page.tsx"
git commit -m "feat(ui): collapsible workspace sidebar shell + stub routes"
```

---

## Self-Review notes
- **Spec coverage:** tokens (§4a) → T1; fonts (§4a) → T1; orange primary → T1 + Button; shell/sidebar (§4b) → T2/T3; stubbed nav → T3; primitives needed by shell → T2. Deferred per §4c: page-body restyles, badges (Slice 2), live structure tree (Slice 9).
- **Placeholder scan:** none — all steps carry real code. `<worktree>` in run commands = the worktree path the controller passes to subagents.
- **Type consistency:** `NavLink`/`projectNav`/`projectIdFromPath` (T1 `lib/nav.ts`) consumed by `Sidebar` (T3); primitives (T2) consumed by `Sidebar` + stubs (T3). `createClient` browser client already exists at `@/lib/supabase/client`.
- **Constraint check:** additive Tailwind `extend` preserves existing utilities; no domain logic touched → no new domain tests; no new deps (`next/font` is built in).
