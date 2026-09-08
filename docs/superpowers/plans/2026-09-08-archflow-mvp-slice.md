# Archflow MVP Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an architecture-hierarchy ticket tracker plus a mobile Site Visit Mode that turns a marked photo into an assignable, verifiable site issue.

**Architecture:** Next.js App Router (server components for data fetch, small client components for interaction) talking to Supabase (Postgres + Auth + Storage) via `@supabase/ssr`. All business rules (status transitions, project health, photo-marker coordinates) live in pure, unit-tested `lib/` modules the UI consumes. One Supabase project = one firm; RLS grants any authenticated staff full access.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 3.4, `@supabase/supabase-js` 2.x, `@supabase/ssr` 0.5.x, Vitest 2.x, Supabase CLI.

**Spec:** `docs/superpowers/specs/2026-09-08-archflow-mvp-slice-design.md`

## Global Constraints

- **Node:** ≥ 20.x (Next 15 requires ≥ 18.18; target 20 LTS).
- **Language:** TypeScript, `strict: true`. No `any` in `lib/` modules.
- **DB integrity of spatial refs** (room under floor under building) is enforced in the app layer, never by cross-table DB constraints.
- **Health is computed on read**, never stored.
- **No new runtime dependency** beyond those listed in Tech Stack without a note in the task.
- **Enums (verbatim):** `role`(staff, admin) · `project_status`(active, on_hold, completed, archived) · `ticket_type`(task, site_issue) · `discipline`(architectural, structural, electrical, plumbing, fire_safety, interior, landscape, construction, documentation, client_coordination) · `ticket_status`(open, in_progress, resolved, verified, closed) · `priority`(low, medium, high, critical) · `attachment_kind`(before, after, reference).
- **Storage bucket:** `ticket-media` (private). Object path: `{project_id}/{ticket_id}/{uuid}.{ext}`.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client); `SUPABASE_SERVICE_ROLE_KEY` used only in server-side signed-URL generation.

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx` (temporary), `vitest.config.ts`, `.env.example`, `.env.local`
- Modify: `.gitignore` (already present)

**Interfaces:**
- Consumes: nothing.
- Produces: a running Next app (`npm run dev`) and a working test runner (`npm test`).

- [ ] **Step 1: Scaffold Next app in-place**

Run in the repo root (dir already contains `.git`, `.gitignore`, `docs/`):
```bash
npx create-next-app@latest . --ts --app --tailwind --eslint --src-dir=false --import-alias "@/*" --no-turbopack --use-npm
```
If prompted about a non-empty directory, choose to continue (it keeps `docs/` and `.git/`).

- [ ] **Step 2: Pin Tailwind to v3.4**

create-next-app may install Tailwind v4. Force v3 for the stable PostCSS setup:
```bash
npm install -D tailwindcss@^3.4 postcss autoprefixer
```
Ensure `postcss.config.mjs` uses:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```
Ensure `app/globals.css` starts with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Ensure `tailwind.config.ts` `content` includes `./app/**/*.{ts,tsx}` and `./components/**/*.{ts,tsx}`.

- [ ] **Step 3: Add Supabase + test deps**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest
```

- [ ] **Step 4: Add Vitest config and test script**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Create env example**

Create `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
Copy to `.env.local` and fill from the Supabase project (Settings → API). `.env*` is already gitignored except `.env.example`.

- [ ] **Step 6: Verify app and tests boot**

Run: `npm run dev` → open http://localhost:3000, confirm the default page renders. Stop the server.
Run: `npm test` → Expected: "No test files found" (exit 0) — runner works, no tests yet.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next + Tailwind + Supabase + Vitest"
```

---

### Task 2: Database migration + seed

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/seed.sql`
- Create: `lib/database.types.ts` (generated)

**Interfaces:**
- Consumes: nothing.
- Produces: all tables/enums/RLS/storage from the spec; a generated `Database` type imported by the Supabase clients.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0001_init.sql`:
```sql
-- Enums
create type role as enum ('staff','admin');
create type project_status as enum ('active','on_hold','completed','archived');
create type ticket_type as enum ('task','site_issue');
create type discipline as enum ('architectural','structural','electrical','plumbing',
  'fire_safety','interior','landscape','construction','documentation','client_coordination');
create type ticket_status as enum ('open','in_progress','resolved','verified','closed');
create type priority as enum ('low','medium','high','critical');
create type attachment_kind as enum ('before','after','reference');

-- Profiles (mirror auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role role not null default 'staff',
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  status project_status not null default 'active',
  client_name text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table buildings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null
);

create table floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  name text not null,
  level_order int not null default 0
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors(id) on delete cascade,
  name text not null
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  project_id uuid not null references projects(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  floor_id uuid references floors(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  type ticket_type not null,
  discipline discipline not null,
  title text not null,
  description text,
  status ticket_status not null default 'open',
  priority priority not null default 'medium',
  assignee_id uuid references profiles(id) on delete set null,
  reporter_id uuid not null references profiles(id),
  due_date date,
  created_at timestamptz not null default now()
);
create index tickets_project_idx on tickets(project_id);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  storage_path text not null,
  kind attachment_kind not null default 'reference',
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table issue_markers (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid not null references attachments(id) on delete cascade,
  x real not null,
  y real not null,
  label text
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS: any authenticated staff has full access
alter table profiles enable row level security;
alter table projects enable row level security;
alter table buildings enable row level security;
alter table floors enable row level security;
alter table rooms enable row level security;
alter table tickets enable row level security;
alter table attachments enable row level security;
alter table issue_markers enable row level security;
alter table comments enable row level security;

-- profiles: read all, update own
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- everything else: authenticated full CRUD
do $$
declare t text;
begin
  foreach t in array array['projects','buildings','floors','rooms','tickets',
    'attachments','issue_markers','comments']
  loop
    execute format('create policy %I_all on %I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- Storage bucket + policies
insert into storage.buckets (id, name, public) values ('ticket-media','ticket-media', false)
  on conflict (id) do nothing;
create policy ticket_media_read on storage.objects for select to authenticated
  using (bucket_id = 'ticket-media');
create policy ticket_media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-media');
```

- [ ] **Step 2: Apply the migration**

Option A (Supabase CLI, local or linked):
```bash
supabase db push
```
Option B: paste `0001_init.sql` into the Supabase Studio SQL editor and run.
Verify: in Studio → Table editor, all nine tables exist; Storage shows a private `ticket-media` bucket.

- [ ] **Step 3: Seed demo data**

Create `supabase/seed.sql` (run after at least one auth user exists; replace `:reporter` with a real profile id, or run the `select` first):
```sql
-- Grab any existing profile as the reporter
with p as (select id from profiles limit 1),
proj as (
  insert into projects (name, code, client_name, created_by)
  select 'Residential Villa', 'VILLA-01', 'A. Client', p.id from p
  returning id
),
b as (insert into buildings (project_id, name) select id, 'Main House' from proj returning id, project_id),
f as (insert into floors (building_id, name, level_order) select id, 'Ground Floor', 0 from b returning id),
r as (insert into rooms (floor_id, name) select id, 'Kitchen' from f returning id)
insert into tickets (project_id, building_id, floor_id, room_id, type, discipline, title, status, priority, reporter_id)
select proj.id, b.id, f.id, r.id, 'site_issue', 'electrical',
  'Socket location conflict', 'open', 'high', p.id
from proj, b, f, r, p;
```
Run via CLI (`supabase db reset` re-applies migrations + seed) or paste in the SQL editor.

- [ ] **Step 4: Generate TypeScript types**

```bash
supabase gen types typescript --linked > lib/database.types.ts
```
(or `--local`). Verify the file exports `Database` with the tables above.

- [ ] **Step 5: Commit**

```bash
git add supabase lib/database.types.ts
git commit -m "feat(db): initial schema, RLS, storage, seed + generated types"
```

---

### Task 3: Status transition logic (pure, TDD)

**Files:**
- Create: `lib/status.ts`
- Test: `tests/status.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type TicketType = 'task' | 'site_issue'`
  - `type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed'`
  - `allowedTransitions(type: TicketType, status: TicketStatus): TicketStatus[]`
  - `canTransition(type: TicketType, from: TicketStatus, to: TicketStatus, ctx: { hasAfterPhoto: boolean }): boolean`

- [ ] **Step 1: Write the failing test**

Create `tests/status.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { allowedTransitions, canTransition } from '@/lib/status'

describe('allowedTransitions', () => {
  it('task: open can go to in_progress or closed', () => {
    expect(allowedTransitions('task', 'open').sort()).toEqual(['closed', 'in_progress'])
  })
  it('task: never exposes resolved/verified', () => {
    const all = (['open','in_progress','closed'] as const).flatMap(s => allowedTransitions('task', s))
    expect(all).not.toContain('resolved')
    expect(all).not.toContain('verified')
  })
  it('site_issue: resolved can go to verified or back to in_progress', () => {
    expect(allowedTransitions('site_issue', 'resolved').sort()).toEqual(['in_progress', 'verified'])
  })
})

describe('canTransition', () => {
  it('blocks verified without an after photo', () => {
    expect(canTransition('site_issue', 'resolved', 'verified', { hasAfterPhoto: false })).toBe(false)
  })
  it('allows verified with an after photo', () => {
    expect(canTransition('site_issue', 'resolved', 'verified', { hasAfterPhoto: true })).toBe(true)
  })
  it('rejects a transition not in the allowed set', () => {
    expect(canTransition('task', 'open', 'verified', { hasAfterPhoto: true })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- status`
Expected: FAIL — cannot resolve `@/lib/status`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/status.ts`:
```ts
export type TicketType = 'task' | 'site_issue'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed'

const TASK: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['open', 'closed'],
  closed: ['open'],
  resolved: [],
  verified: [],
}

const SITE: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['verified', 'in_progress'],
  verified: ['closed', 'in_progress'],
  closed: [],
}

export function allowedTransitions(type: TicketType, status: TicketStatus): TicketStatus[] {
  return (type === 'task' ? TASK : SITE)[status]
}

export function canTransition(
  type: TicketType,
  from: TicketStatus,
  to: TicketStatus,
  ctx: { hasAfterPhoto: boolean },
): boolean {
  if (!allowedTransitions(type, from).includes(to)) return false
  if (to === 'verified' && !ctx.hasAfterPhoto) return false
  return true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- status` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/status.ts tests/status.test.ts
git commit -m "feat(logic): ticket status transition rules"
```

---

### Task 4: Project health logic (pure, TDD)

**Files:**
- Create: `lib/health.ts`
- Test: `tests/health.test.ts`

**Interfaces:**
- Consumes: `TicketType`, `TicketStatus` from `@/lib/status`.
- Produces:
  - `type Priority = 'low' | 'medium' | 'high' | 'critical'`
  - `type Health = 'green' | 'yellow' | 'red'`
  - `interface HealthTicket { type: TicketType; status: TicketStatus; priority: Priority; due_date: string | null }`
  - `computeHealth(tickets: HealthTicket[], today: Date): Health`

- [ ] **Step 1: Write the failing test**

Create `tests/health.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeHealth, type HealthTicket } from '@/lib/health'

const today = new Date('2026-09-08')
const base: HealthTicket = { type: 'task', status: 'open', priority: 'medium', due_date: null }

describe('computeHealth', () => {
  it('green when nothing pressing', () => {
    expect(computeHealth([{ ...base, due_date: '2026-12-01' }], today)).toBe('green')
  })
  it('red when a ticket is overdue and still open', () => {
    expect(computeHealth([{ ...base, due_date: '2026-09-01' }], today)).toBe('red')
  })
  it('overdue ignored when ticket is closed/verified', () => {
    expect(computeHealth([{ ...base, status: 'closed', due_date: '2026-09-01' }], today)).toBe('green')
  })
  it('red when a critical ticket is open', () => {
    expect(computeHealth([{ ...base, priority: 'critical' }], today)).toBe('red')
  })
  it('yellow when a site issue is open (not overdue/critical)', () => {
    expect(computeHealth([{ ...base, type: 'site_issue', priority: 'low' }], today)).toBe('yellow')
  })
  it('yellow when due within 3 days', () => {
    expect(computeHealth([{ ...base, due_date: '2026-09-10' }], today)).toBe('yellow')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- health` → Expected: FAIL — cannot resolve `@/lib/health`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/health.ts`:
```ts
import type { TicketType, TicketStatus } from '@/lib/status'

export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type Health = 'green' | 'yellow' | 'red'

export interface HealthTicket {
  type: TicketType
  status: TicketStatus
  priority: Priority
  due_date: string | null
}

const DONE: TicketStatus[] = ['closed', 'verified']

function daysBetween(a: Date, b: Date): number {
  const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)
  return Math.round(ms / 86_400_000)
}

export function computeHealth(tickets: HealthTicket[], today: Date): Health {
  let red = false
  let yellow = false
  for (const t of tickets) {
    const done = DONE.includes(t.status)
    if (t.priority === 'critical' && !done && t.status !== 'resolved') red = true
    if (t.due_date && !done) {
      const d = daysBetween(today, new Date(t.due_date))
      if (d < 0) red = true
      else if (d <= 3) yellow = true
    }
    if (t.type === 'site_issue' && (t.status === 'open' || t.status === 'in_progress')) yellow = true
  }
  if (red) return 'red'
  if (yellow) return 'yellow'
  return 'green'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- health` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/health.ts tests/health.test.ts
git commit -m "feat(logic): project health computation"
```

---

### Task 5: Photo-marker coordinate logic (pure, TDD)

**Files:**
- Create: `lib/markers.ts`
- Test: `tests/markers.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Norm { x: number; y: number }`
  - `interface Rect { left: number; top: number; width: number; height: number }`
  - `toNormalized(clientX: number, clientY: number, rect: Rect): Norm` — result clamped to [0,1]
  - `toPixels(n: Norm, rect: Rect): { left: number; top: number }`

- [ ] **Step 1: Write the failing test**

Create `tests/markers.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { toNormalized, toPixels } from '@/lib/markers'

const rect = { left: 100, top: 50, width: 200, height: 400 }

describe('toNormalized', () => {
  it('maps a click to a fraction of the rect', () => {
    expect(toNormalized(200, 250, rect)).toEqual({ x: 0.5, y: 0.5 })
  })
  it('clamps clicks outside the rect into [0,1]', () => {
    expect(toNormalized(0, 0, rect)).toEqual({ x: 0, y: 0 })
    expect(toNormalized(9999, 9999, rect)).toEqual({ x: 1, y: 1 })
  })
})

describe('toPixels', () => {
  it('is the inverse of toNormalized for in-bounds points', () => {
    expect(toPixels({ x: 0.5, y: 0.5 }, rect)).toEqual({ left: 200, top: 250 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- markers` → Expected: FAIL — cannot resolve `@/lib/markers`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/markers.ts`:
```ts
export interface Norm { x: number; y: number }
export interface Rect { left: number; top: number; width: number; height: number }

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export function toNormalized(clientX: number, clientY: number, rect: Rect): Norm {
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  }
}

export function toPixels(n: Norm, rect: Rect): { left: number; top: number } {
  return { left: rect.left + n.x * rect.width, top: rect.top + n.y * rect.height }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- markers` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/markers.ts tests/markers.test.ts
git commit -m "feat(logic): photo marker coordinate mapping"
```

---

### Task 6: Supabase clients, auth middleware, login

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`, `middleware.ts`
- Create: `app/login/page.tsx`, `app/auth/signout/route.ts`
- Create: `app/(app)/layout.tsx`
- Modify: delete temporary `app/page.tsx` content (replaced in Task 7)

**Interfaces:**
- Consumes: `Database` from `@/lib/database.types`.
- Produces:
  - `createClient()` (browser) from `lib/supabase/client.ts`
  - `createClient()` (server, async, cookie-bound) from `lib/supabase/server.ts`
  - `updateSession(request)` from `lib/supabase/middleware.ts`
  - An authed route group `(app)` that redirects unauthenticated users to `/login`.

- [ ] **Step 1: Browser client**

Create `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 2: Server client**

Create `lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // called from a Server Component — safe to ignore, middleware refreshes
          }
        },
      },
    },
  )
}
```

- [ ] **Step 3: Session middleware**

Create `lib/supabase/middleware.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = path.startsWith('/login') || path.startsWith('/auth')
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return response
}
```

Create `middleware.ts` (repo root):
```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webmanifest)$).*)'],
}
```

- [ ] **Step 4: Login page (email/password, no signup)**

Create `app/login/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/')
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 text-2xl font-semibold">Archflow</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded border p-2" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border p-2" type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black p-2 text-white" type="submit">Sign in</button>
      </form>
      <p className="mt-4 text-xs text-gray-500">Accounts are created by an admin in Supabase.</p>
    </main>
  )
}
```

Create `app/auth/signout/route.ts`:
```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url))
}
```

- [ ] **Step 5: Authed shell layout**

Create `app/(app)/layout.tsx`:
```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="font-semibold">Archflow</Link>
          <Link href="/site">Site Visit</Link>
        </nav>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-gray-500">Sign out</button>
        </form>
      </header>
      <div className="p-4">{children}</div>
    </div>
  )
}
```

- [ ] **Step 6: Move the home route into the group**

Delete the scaffolded `app/page.tsx`. The dashboard at `app/(app)/page.tsx` is created in Task 7 (route group `(app)` maps to `/`).

- [ ] **Step 7: Verify auth gate**

Create a test user: Supabase Studio → Authentication → Add user (email + password, auto-confirm).
Run `npm run dev`. Visit `/` unauthenticated → redirected to `/login`. Sign in → reach `/` (will 404 until Task 7; that's expected). Confirm "Sign out" returns to `/login`.

- [ ] **Step 8: Commit**

```bash
git add lib/supabase middleware.ts app/login app/auth "app/(app)/layout.tsx"
git rm --cached app/page.tsx 2>/dev/null; rm -f app/page.tsx
git commit -m "feat(auth): supabase clients, session middleware, login, authed shell"
```

---

### Task 7: Dashboard

**Files:**
- Create: `app/(app)/page.tsx`, `components/HealthDot.tsx`, `components/NewProjectForm.tsx`
- Create: `app/(app)/actions.ts` (server action: create project)

**Interfaces:**
- Consumes: `computeHealth`, `Health` from `@/lib/health`; server `createClient`.
- Produces: `createProject(formData)` server action.

- [ ] **Step 1: Health dot component**

Create `components/HealthDot.tsx`:
```tsx
import type { Health } from '@/lib/health'
const COLOR: Record<Health, string> = { green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500' }
export function HealthDot({ health }: { health: Health }) {
  return <span className={`inline-block h-3 w-3 rounded-full ${COLOR[health]}`} title={health} />
}
```

- [ ] **Step 2: Create-project server action**

Create `app/(app)/actions.ts`:
```ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createProject(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('projects').insert({
    name,
    code: String(formData.get('code') ?? '') || null,
    client_name: String(formData.get('client_name') ?? '') || null,
    created_by: user!.id,
  })
  revalidatePath('/')
}
```

- [ ] **Step 3: New-project form (client)**

Create `components/NewProjectForm.tsx`:
```tsx
'use client'
import { createProject } from '@/app/(app)/actions'
export function NewProjectForm() {
  return (
    <form action={createProject} className="flex flex-wrap gap-2">
      <input name="name" placeholder="Project name" required className="rounded border p-2" />
      <input name="code" placeholder="Code" className="rounded border p-2" />
      <input name="client_name" placeholder="Client" className="rounded border p-2" />
      <button className="rounded bg-black px-3 text-white">Add</button>
    </form>
  )
}
```

- [ ] **Step 4: Dashboard page**

Create `app/(app)/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeHealth, type HealthTicket } from '@/lib/health'
import { HealthDot } from '@/components/HealthDot'
import { NewProjectForm } from '@/components/NewProjectForm'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from('projects').select('id, name, code').order('created_at')
  const { data: tickets } = await supabase
    .from('tickets')
    .select('project_id, type, status, priority, due_date')

  const today = new Date()
  const byProject = new Map<string, HealthTicket[]>()
  for (const t of tickets ?? []) {
    const arr = byProject.get(t.project_id) ?? []
    arr.push(t as HealthTicket)
    byProject.set(t.project_id, arr)
  }
  const iso = today.toISOString().slice(0, 10)
  const counts = (list: HealthTicket[]) => ({
    dueToday: list.filter((t) => t.due_date === iso).length,
    overdue: list.filter((t) => t.due_date && t.due_date < iso && !['closed', 'verified'].includes(t.status)).length,
    openSite: list.filter((t) => t.type === 'site_issue' && ['open', 'in_progress'].includes(t.status)).length,
  })

  return (
    <main className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">New project</h2>
        <NewProjectForm />
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Projects</h2>
        <ul className="divide-y rounded border">
          {(projects ?? []).map((p) => {
            const list = byProject.get(p.id) ?? []
            const c = counts(list)
            return (
              <li key={p.id} className="flex items-center justify-between p-3">
                <Link href={`/projects/${p.id}`} className="flex items-center gap-2">
                  <HealthDot health={computeHealth(list, today)} />
                  <span className="font-medium">{p.name}</span>
                  {p.code && <span className="text-xs text-gray-500">{p.code}</span>}
                </Link>
                <span className="text-xs text-gray-500">
                  due today {c.dueToday} · overdue {c.overdue} · open site {c.openSite}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Verify**

Run `npm run dev`, sign in. Dashboard lists the seeded "Residential Villa" with a health dot and counts (the seeded high-priority open site issue → yellow, open-site 1). Add a project via the form → it appears.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/page.tsx" "app/(app)/actions.ts" components/HealthDot.tsx components/NewProjectForm.tsx
git commit -m "feat(dashboard): project list with health and counts"
```

---

### Task 8: Project view — hierarchy + ticket list + new ticket

**Files:**
- Create: `app/(app)/projects/[id]/page.tsx`, `components/HierarchySidebar.tsx`, `components/TicketList.tsx`, `components/NewTicketForm.tsx`
- Modify: `app/(app)/actions.ts` (add hierarchy + ticket actions)

**Interfaces:**
- Consumes: server `createClient`; enums from Global Constraints.
- Produces server actions: `addBuilding`, `addFloor`, `addRoom`, `createTicket` (all take `FormData`, `revalidatePath` the project).

- [ ] **Step 1: Add server actions**

Append to `app/(app)/actions.ts`:
```ts
export async function addBuilding(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('buildings').insert({
    project_id: String(formData.get('project_id')),
    name: String(formData.get('name')).trim(),
  })
  revalidatePath(`/projects/${formData.get('project_id')}`)
}

export async function addFloor(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('floors').insert({
    building_id: String(formData.get('building_id')),
    name: String(formData.get('name')).trim(),
  })
  revalidatePath(`/projects/${formData.get('project_id')}`)
}

export async function addRoom(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('rooms').insert({
    floor_id: String(formData.get('floor_id')),
    name: String(formData.get('name')).trim(),
  })
  revalidatePath(`/projects/${formData.get('project_id')}`)
}

export async function createTicket(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const opt = (k: string) => { const v = String(formData.get(k) ?? ''); return v || null }
  await supabase.from('tickets').insert({
    project_id: String(formData.get('project_id')),
    building_id: opt('building_id'),
    floor_id: opt('floor_id'),
    room_id: opt('room_id'),
    type: (formData.get('type') as 'task' | 'site_issue') ?? 'task',
    discipline: String(formData.get('discipline')) as never,
    title: String(formData.get('title')).trim(),
    priority: (formData.get('priority') as never) ?? 'medium',
    due_date: opt('due_date'),
    reporter_id: user!.id,
  })
  revalidatePath(`/projects/${formData.get('project_id')}`)
}
```

- [ ] **Step 2: Hierarchy sidebar (add controls)**

Create `components/HierarchySidebar.tsx`:
```tsx
import { addBuilding, addFloor, addRoom } from '@/app/(app)/actions'

type Room = { id: string; name: string }
type Floor = { id: string; name: string; rooms: Room[] }
type Building = { id: string; name: string; floors: Floor[] }

export function HierarchySidebar({ projectId, buildings }: { projectId: string; buildings: Building[] }) {
  return (
    <aside className="w-64 space-y-3 border-r pr-3 text-sm">
      <h3 className="font-semibold">Spaces</h3>
      {buildings.map((b) => (
        <div key={b.id} className="space-y-1">
          <div className="font-medium">{b.name}</div>
          {b.floors.map((f) => (
            <div key={f.id} className="ml-3">
              <div>{f.name}</div>
              {f.rooms.map((r) => <div key={r.id} className="ml-3 text-gray-600">{r.name}</div>)}
              <form action={addRoom} className="ml-3 flex gap-1">
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="floor_id" value={f.id} />
                <input name="name" placeholder="+ room" className="w-full rounded border px-1" />
              </form>
            </div>
          ))}
          <form action={addFloor} className="ml-3 flex gap-1">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="building_id" value={b.id} />
            <input name="name" placeholder="+ floor" className="w-full rounded border px-1" />
          </form>
        </div>
      ))}
      <form action={addBuilding} className="flex gap-1">
        <input type="hidden" name="project_id" value={projectId} />
        <input name="name" placeholder="+ building" className="w-full rounded border px-1" />
      </form>
    </aside>
  )
}
```
*(Each `+ x` input submits on Enter — a bare text field in a form. ponytail: no explicit submit button, Enter is the whole interaction.)*

- [ ] **Step 3: Ticket list + filters**

Create `components/TicketList.tsx`:
```tsx
import Link from 'next/link'

type Row = {
  id: string; seq: number; type: string; discipline: string
  title: string; status: string; priority: string; due_date: string | null
}

export function TicketList({ tickets }: { tickets: Row[] }) {
  if (tickets.length === 0) return <p className="text-sm text-gray-500">No tickets yet.</p>
  return (
    <ul className="divide-y rounded border">
      {tickets.map((t) => (
        <li key={t.id} className="flex items-center justify-between p-2 text-sm">
          <Link href={`/tickets/${t.id}`} className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500">
              {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
            </span>
            <span>{t.title}</span>
          </Link>
          <span className="flex gap-2 text-xs text-gray-500">
            <span>{t.discipline}</span><span>{t.priority}</span><span>{t.status}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
```

Filters use URL search params (no client state). Create `components/TicketFilters.tsx`:
```tsx
'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const STATUS = ['', 'open', 'in_progress', 'resolved', 'verified', 'closed']
const DISCIPLINE = ['', 'architectural', 'structural', 'electrical', 'plumbing', 'fire_safety',
  'interior', 'landscape', 'construction', 'documentation', 'client_coordination']

export function TicketFilters() {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams()
  function set(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value); else p.delete(key)
    router.replace(`${pathname}?${p.toString()}`)
  }
  return (
    <div className="flex gap-2 text-sm">
      <select className="rounded border p-1" defaultValue={params.get('status') ?? ''}
        onChange={(e) => set('status', e.target.value)}>
        {STATUS.map((s) => <option key={s} value={s}>{s || 'any status'}</option>)}
      </select>
      <select className="rounded border p-1" defaultValue={params.get('discipline') ?? ''}
        onChange={(e) => set('discipline', e.target.value)}>
        {DISCIPLINE.map((d) => <option key={d} value={d}>{d || 'any discipline'}</option>)}
      </select>
    </div>
  )
}
```

- [ ] **Step 4: New-ticket form**

Create `components/NewTicketForm.tsx`:
```tsx
'use client'
import { createTicket } from '@/app/(app)/actions'

const DISCIPLINE = ['architectural', 'structural', 'electrical', 'plumbing', 'fire_safety',
  'interior', 'landscape', 'construction', 'documentation', 'client_coordination']

export function NewTicketForm({ projectId }: { projectId: string }) {
  return (
    <form action={createTicket} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="project_id" value={projectId} />
      <input name="title" placeholder="Ticket title" required className="rounded border p-1" />
      <select name="type" className="rounded border p-1"><option value="task">task</option><option value="site_issue">site_issue</option></select>
      <select name="discipline" className="rounded border p-1">{DISCIPLINE.map((d) => <option key={d}>{d}</option>)}</select>
      <select name="priority" className="rounded border p-1" defaultValue="medium">
        {['low', 'medium', 'high', 'critical'].map((p) => <option key={p}>{p}</option>)}
      </select>
      <input name="due_date" type="date" className="rounded border p-1" />
      <button className="rounded bg-black px-3 text-white">Add</button>
    </form>
  )
}
```

- [ ] **Step 5: Project page (fetch tree + filtered tickets)**

Create `app/(app)/projects/[id]/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { HierarchySidebar } from '@/components/HierarchySidebar'
import { TicketList } from '@/components/TicketList'
import { TicketFilters } from '@/components/TicketFilters'
import { NewTicketForm } from '@/components/NewTicketForm'

export default async function ProjectPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string; discipline?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('name, code').eq('id', id).single()
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name, floors(id, name, rooms(id, name))')
    .eq('project_id', id)

  let q = supabase.from('tickets')
    .select('id, seq, type, discipline, title, status, priority, due_date')
    .eq('project_id', id).order('seq', { ascending: false })
  if (sp.status) q = q.eq('status', sp.status as never)
  if (sp.discipline) q = q.eq('discipline', sp.discipline as never)
  const { data: tickets } = await q

  return (
    <main className="flex gap-6">
      <HierarchySidebar projectId={id} buildings={(buildings as never) ?? []} />
      <div className="flex-1 space-y-4">
        <h1 className="text-xl font-semibold">{project?.name}</h1>
        <NewTicketForm projectId={id} />
        <TicketFilters />
        <TicketList tickets={(tickets as never) ?? []} />
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Verify**

Sign in → open the seeded project. Add a building → floor → room (type name, press Enter). Add a ticket. Change the status/discipline filters → list narrows. Ticket links point to `/tickets/[id]`.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/projects" "app/(app)/actions.ts" components/HierarchySidebar.tsx components/TicketList.tsx components/TicketFilters.tsx components/NewTicketForm.tsx
git commit -m "feat(project): hierarchy, ticket list, filters, ticket creation"
```

---

### Task 9: Media upload + PhotoMarker component

**Files:**
- Create: `components/PhotoMarker.tsx`
- Create: `app/(app)/media-actions.ts` (server actions: signed URL, save attachment + markers)

**Interfaces:**
- Consumes: `toNormalized`, `toPixels`, `Norm` from `@/lib/markers`.
- Produces:
  - `signedUrl(path: string): Promise<string>` server action.
  - `saveAttachment(input: { ticketId: string; projectId: string; storagePath: string; kind: 'before'|'after'|'reference'; markers: { x:number; y:number; label:string|null }[] }): Promise<void>` server action.
  - `PhotoMarker` client component: props `{ src: string; value: Marker[]; editable: boolean; onChange?: (m: Marker[]) => void }` where `Marker = { x:number; y:number; label:string|null }`.

- [ ] **Step 1: Media server actions**

Create `app/(app)/media-actions.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function signedUrl(path: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from('ticket-media').createSignedUrl(path, 3600)
  return data?.signedUrl ?? ''
}

export async function saveAttachment(input: {
  ticketId: string; projectId: string; storagePath: string
  kind: 'before' | 'after' | 'reference'
  markers: { x: number; y: number; label: string | null }[]
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: att } = await supabase.from('attachments').insert({
    ticket_id: input.ticketId, storage_path: input.storagePath,
    kind: input.kind, uploaded_by: user!.id,
  }).select('id').single()
  if (att && input.markers.length) {
    await supabase.from('issue_markers').insert(
      input.markers.map((m) => ({ attachment_id: att.id, x: m.x, y: m.y, label: m.label })),
    )
  }
  revalidatePath(`/tickets/${input.ticketId}`)
  revalidatePath(`/projects/${input.projectId}`)
}
```
*Upload of the file bytes happens client-side via the browser Supabase client (`supabase.storage.from('ticket-media').upload(path, file)`); `saveAttachment` records the row + pins afterward.*

- [ ] **Step 2: PhotoMarker component**

Create `components/PhotoMarker.tsx`:
```tsx
'use client'
import { useRef } from 'react'
import { toNormalized } from '@/lib/markers'

export type Marker = { x: number; y: number; label: string | null }

export function PhotoMarker({
  src, value, editable, onChange,
}: {
  src: string; value: Marker[]; editable: boolean
  onChange?: (m: Marker[]) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  function handleClick(e: React.MouseEvent) {
    if (!editable || !onChange || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const n = toNormalized(e.clientX, e.clientY, rect)
    onChange([...value, { x: n.x, y: n.y, label: null }])
  }

  return (
    <div ref={ref} onClick={handleClick} className="relative inline-block select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="max-w-full rounded" />
      {value.map((m, i) => (
        <span key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 px-2 text-xs text-white shadow"
          style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
          title={m.label ?? ''}>{i + 1}</span>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify (temporary harness)**

`lib/markers.ts` is already unit-tested (Task 5), which covers the coordinate math this component relies on. Visual confirmation happens in Task 10/11 when PhotoMarker is mounted with a real image. No separate step here.

- [ ] **Step 4: Commit**

```bash
git add components/PhotoMarker.tsx "app/(app)/media-actions.ts"
git commit -m "feat(media): signed URLs, attachment save, PhotoMarker component"
```

---

### Task 10: Ticket detail — fields, status, photos, before/after, comments

**Files:**
- Create: `app/(app)/tickets/[id]/page.tsx`, `components/StatusControl.tsx`, `components/BeforeAfter.tsx`, `components/CommentThread.tsx`
- Modify: `app/(app)/actions.ts` (add `changeStatus`, `addComment`)

**Interfaces:**
- Consumes: `allowedTransitions`, `canTransition` from `@/lib/status`; `signedUrl` from media-actions; `PhotoMarker`.
- Produces server actions: `changeStatus(formData)`, `addComment(formData)`.

- [ ] **Step 1: Status + comment server actions**

Append to `app/(app)/actions.ts`:
```ts
import { canTransition, type TicketType, type TicketStatus } from '@/lib/status'

export async function changeStatus(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('ticket_id'))
  const to = String(formData.get('to')) as TicketStatus
  const { data: t } = await supabase.from('tickets').select('type, status').eq('id', id).single()
  if (!t) return
  const { count } = await supabase.from('attachments')
    .select('id', { count: 'exact', head: true }).eq('ticket_id', id).eq('kind', 'after')
  const ok = canTransition(t.type as TicketType, t.status as TicketStatus, to, { hasAfterPhoto: (count ?? 0) > 0 })
  if (!ok) return
  await supabase.from('tickets').update({ status: to }).eq('id', id)
  revalidatePath(`/tickets/${id}`)
}

export async function addComment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const id = String(formData.get('ticket_id'))
  const body = String(formData.get('body')).trim()
  if (!body) return
  await supabase.from('comments').insert({ ticket_id: id, author_id: user!.id, body })
  revalidatePath(`/tickets/${id}`)
}
```

- [ ] **Step 2: Status control**

Create `components/StatusControl.tsx`:
```tsx
import { allowedTransitions, type TicketType, type TicketStatus } from '@/lib/status'
import { changeStatus } from '@/app/(app)/actions'

export function StatusControl({ id, type, status }: { id: string; type: TicketType; status: TicketStatus }) {
  const next = allowedTransitions(type, status)
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded bg-gray-100 px-2 py-1">{status}</span>
      {next.map((to) => (
        <form key={to} action={changeStatus}>
          <input type="hidden" name="ticket_id" value={id} />
          <input type="hidden" name="to" value={to} />
          <button className="rounded border px-2 py-1">→ {to}</button>
        </form>
      ))}
    </div>
  )
}
```
*`verified` may be offered by `allowedTransitions` but rejected server-side by `changeStatus` when no after-photo exists — the server is the source of truth. ponytail: no duplicate client-side guard.*

- [ ] **Step 3: BeforeAfter + resolved images**

Create `components/BeforeAfter.tsx`:
```tsx
import { PhotoMarker, type Marker } from '@/components/PhotoMarker'

type Photo = { url: string; markers: Marker[] }

export function BeforeAfter({ before, after }: { before: Photo[]; after: Photo[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="mb-1 text-sm font-medium">Before</h4>
        {before.map((p, i) => <PhotoMarker key={i} src={p.url} value={p.markers} editable={false} />)}
      </div>
      <div>
        <h4 className="mb-1 text-sm font-medium">After</h4>
        {after.length === 0 && <p className="text-sm text-gray-400">No after photo yet.</p>}
        {after.map((p, i) => <PhotoMarker key={i} src={p.url} value={p.markers} editable={false} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Comment thread**

Create `components/CommentThread.tsx`:
```tsx
import { addComment } from '@/app/(app)/actions'

type C = { id: string; body: string; created_at: string; author: string | null }

export function CommentThread({ ticketId, comments }: { ticketId: string; comments: C[] }) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-medium">Comments</h4>
      <ul className="space-y-1 text-sm">
        {comments.map((c) => (
          <li key={c.id}><span className="text-gray-500">{c.author ?? 'someone'}:</span> {c.body}</li>
        ))}
      </ul>
      <form action={addComment} className="flex gap-2">
        <input type="hidden" name="ticket_id" value={ticketId} />
        <input name="body" placeholder="Add a comment" className="flex-1 rounded border p-1 text-sm" />
        <button className="rounded bg-black px-3 text-sm text-white">Post</button>
      </form>
    </section>
  )
}
```

- [ ] **Step 5: Ticket detail page**

Create `app/(app)/tickets/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signedUrl } from '@/app/(app)/media-actions'
import { StatusControl } from '@/components/StatusControl'
import { BeforeAfter } from '@/components/BeforeAfter'
import { CommentThread } from '@/components/CommentThread'
import type { TicketType, TicketStatus } from '@/lib/status'
import type { Marker } from '@/components/PhotoMarker'

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: t } = await supabase.from('tickets')
    .select('id, seq, type, discipline, title, description, status, priority, due_date, project_id')
    .eq('id', id).single()
  if (!t) notFound()

  const { data: atts } = await supabase.from('attachments')
    .select('id, storage_path, kind, issue_markers(x, y, label)').eq('ticket_id', id)

  async function toPhoto(a: NonNullable<typeof atts>[number]) {
    return {
      url: await signedUrl(a.storage_path),
      markers: (a.issue_markers ?? []) as Marker[],
      kind: a.kind,
    }
  }
  const photos = await Promise.all((atts ?? []).map(toPhoto))
  const before = photos.filter((p) => p.kind === 'before')
  const after = photos.filter((p) => p.kind === 'after')

  const { data: comments } = await supabase.from('comments')
    .select('id, body, created_at, profiles(full_name)').eq('ticket_id', id).order('created_at')

  return (
    <main className="max-w-3xl space-y-5">
      <div>
        <div className="font-mono text-xs text-gray-500">
          {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
        </div>
        <h1 className="text-xl font-semibold">{t.title}</h1>
        <div className="mt-1 flex gap-3 text-xs text-gray-500">
          <span>{t.discipline}</span><span>{t.priority}</span>
          {t.due_date && <span>due {t.due_date}</span>}
        </div>
      </div>
      {t.description && <p className="text-sm">{t.description}</p>}
      <StatusControl id={t.id} type={t.type as TicketType} status={t.status as TicketStatus} />
      {t.type === 'site_issue'
        ? <BeforeAfter before={before} after={after} />
        : photos.map((p, i) => <img key={i} src={p.url} alt="" className="max-w-full rounded" />)}
      <CommentThread
        ticketId={t.id}
        comments={(comments ?? []).map((c) => ({
          id: c.id, body: c.body, created_at: c.created_at,
          author: (c.profiles as { full_name: string | null } | null)?.full_name ?? null,
        }))}
      />
    </main>
  )
}
```

- [ ] **Step 6: Verify**

Open the seeded site issue. Confirm status control offers only `→ in_progress`. Move to in_progress → resolved. Confirm `→ verified` is offered but does nothing until an after-photo exists (added in Task 11). Post a comment → it appears.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/tickets" "app/(app)/actions.ts" components/StatusControl.tsx components/BeforeAfter.tsx components/CommentThread.tsx
git commit -m "feat(ticket): detail view, status transitions, before/after, comments"
```

---

### Task 11: Site Visit Mode + after-photo upload

**Files:**
- Create: `app/(app)/site/page.tsx`, `components/SiteCapture.tsx`, `components/AddPhoto.tsx`
- Modify: `app/(app)/media-actions.ts` (add `createSiteIssue`)

**Interfaces:**
- Consumes: browser `createClient` (upload), `PhotoMarker`, `saveAttachment`, `signedUrl`.
- Produces:
  - `createSiteIssue(input): Promise<string>` server action returning the new ticket id.
  - `AddPhoto` client component reused for adding `after` photos on the ticket page.

- [ ] **Step 1: createSiteIssue server action**

Append to `app/(app)/media-actions.ts`:
```ts
export async function createSiteIssue(input: {
  projectId: string; title: string; discipline: string; priority: string
}): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase.from('tickets').insert({
    project_id: input.projectId, type: 'site_issue',
    discipline: input.discipline as never, title: input.title,
    priority: input.priority as never, reporter_id: user!.id,
  }).select('id').single()
  return data!.id
}
```

- [ ] **Step 2: SiteCapture flow (client)**

Create `components/SiteCapture.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PhotoMarker, type Marker } from '@/components/PhotoMarker'
import { createSiteIssue } from '@/app/(app)/media-actions'
import { saveAttachment } from '@/app/(app)/media-actions'

const DISCIPLINE = ['architectural', 'structural', 'electrical', 'plumbing', 'fire_safety',
  'interior', 'landscape', 'construction', 'documentation', 'client_coordination']

export function SiteCapture({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter()
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [markers, setMarkers] = useState<Marker[]>([])
  const [title, setTitle] = useState('')
  const [discipline, setDiscipline] = useState('architectural')
  const [priority, setPriority] = useState('high')
  const [busy, setBusy] = useState(false)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f); setMarkers([])
    setPreview(f ? URL.createObjectURL(f) : '')
  }

  async function submit() {
    if (!file || !title || !projectId) return
    setBusy(true)
    const ticketId = await createSiteIssue({ projectId, title, discipline, priority })
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${projectId}/${ticketId}/${crypto.randomUUID()}.${ext}`
    const supabase = createClient()
    await supabase.storage.from('ticket-media').upload(path, file)
    await saveAttachment({ ticketId, projectId, storagePath: path, kind: 'before', markers })
    router.push(`/tickets/${ticketId}`)
  }

  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-lg font-semibold">Site Visit</h1>
      <select className="w-full rounded border p-2" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input type="file" accept="image/*" capture="environment" onChange={onFile} className="w-full" />
      {preview && <PhotoMarker src={preview} value={markers} editable onChange={setMarkers} />}
      {preview && <p className="text-xs text-gray-500">Tap the photo to mark problem spots ({markers.length}).</p>}
      <input className="w-full rounded border p-2" placeholder="What's the issue?" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex gap-2">
        <select className="flex-1 rounded border p-2" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
          {DISCIPLINE.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="rounded border p-2" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {['low', 'medium', 'high', 'critical'].map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <button disabled={busy} onClick={submit} className="w-full rounded bg-black p-2 text-white disabled:opacity-50">
        {busy ? 'Submitting…' : 'Submit issue'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Site page (server, fetch projects)**

Create `app/(app)/site/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { SiteCapture } from '@/components/SiteCapture'

export default async function SitePage() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from('projects').select('id, name').order('name')
  return <SiteCapture projects={projects ?? []} />
}
```

- [ ] **Step 4: AddPhoto (reusable — used for after-photos on the ticket page)**

Create `components/AddPhoto.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PhotoMarker, type Marker } from '@/components/PhotoMarker'
import { saveAttachment } from '@/app/(app)/media-actions'

export function AddPhoto({ ticketId, projectId, kind }: {
  ticketId: string; projectId: string; kind: 'before' | 'after' | 'reference'
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [markers, setMarkers] = useState<Marker[]>([])
  const [busy, setBusy] = useState(false)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f); setMarkers([]); setPreview(f ? URL.createObjectURL(f) : '')
  }
  async function submit() {
    if (!file) return
    setBusy(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${projectId}/${ticketId}/${crypto.randomUUID()}.${ext}`
    await createClient().storage.from('ticket-media').upload(path, file)
    await saveAttachment({ ticketId, projectId, storagePath: path, kind, markers })
    setFile(null); setPreview(''); setMarkers([]); setBusy(false)
    router.refresh()
  }
  return (
    <div className="space-y-2">
      <input type="file" accept="image/*" capture="environment" onChange={onFile} />
      {preview && <PhotoMarker src={preview} value={markers} editable onChange={setMarkers} />}
      {preview && <button disabled={busy} onClick={submit} className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50">
        {busy ? 'Uploading…' : `Save ${kind} photo`}</button>}
    </div>
  )
}
```

- [ ] **Step 5: Wire AddPhoto (after) into the ticket page**

Modify `app/(app)/tickets/[id]/page.tsx`: import `AddPhoto` and, inside the `site_issue` branch, render an after-photo uploader below `BeforeAfter`:
```tsx
// add import at top:
import { AddPhoto } from '@/components/AddPhoto'
// replace the site_issue branch:
{t.type === 'site_issue' ? (
  <div className="space-y-3">
    <BeforeAfter before={before} after={after} />
    <AddPhoto ticketId={t.id} projectId={t.project_id} kind="after" />
  </div>
) : (
  photos.map((p, i) => <img key={i} src={p.url} alt="" className="max-w-full rounded" />)
)}
```

- [ ] **Step 6: Verify the full loop**

On a phone (or browser): `/site` → pick project → take/choose a photo → tap to add a pin → title + discipline + priority → Submit → land on the ticket with the before-photo and pin shown. On the ticket, upload an after-photo → it appears under "After". Now `→ verified` succeeds (after-photo exists); confirm status becomes `verified`.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/site" "app/(app)/media-actions.ts" components/SiteCapture.tsx components/AddPhoto.tsx "app/(app)/tickets/[id]/page.tsx"
git commit -m "feat(site): site visit capture, photo markers, before/after loop"
```

---

### Task 12: PWA manifest + install polish

**Files:**
- Create: `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`
- Modify: `app/layout.tsx` (metadata)

**Interfaces:**
- Consumes: nothing.
- Produces: an installable PWA (add-to-home-screen on mobile).

- [ ] **Step 1: Manifest**

Create `public/manifest.webmanifest`:
```json
{
  "name": "Archflow",
  "short_name": "Archflow",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
Add two square PNG icons (192, 512) to `public/` — any simple Archflow mark. (ponytail: a flat-color square with a letter is fine for MVP; replace with a real icon later.)

- [ ] **Step 2: Link manifest in root metadata**

Modify `app/layout.tsx` — add to the exported `metadata`:
```ts
export const metadata = {
  title: 'Archflow',
  manifest: '/manifest.webmanifest',
}
```

- [ ] **Step 3: Verify**

Run `npm run dev`, open Chrome DevTools → Application → Manifest: no errors, icons load, "installable". On a phone, "Add to Home Screen" opens the app standalone.

- [ ] **Step 4: Commit**

```bash
git add public/manifest.webmanifest public/icon-192.png public/icon-512.png app/layout.tsx
git commit -m "feat(pwa): manifest and installable app"
```

---

## Self-Review

**Spec coverage:**
- Data model (spec §3) → Task 2. ✓
- Status model (§4) → Task 3 + used in Tasks 10/11. ✓
- Auth & RLS + trigger + storage (§5) → Task 2 (policies/trigger/bucket) + Task 6 (clients/middleware/login). ✓
- Screens (§6): login/shell → Task 6; dashboard → Task 7; project view → Task 8; ticket detail → Task 10; site mode → Task 11. ✓
- PhotoMarker (§6) → Task 9, mounted in 10/11. ✓
- Pure logic modules (§7): status → Task 3, health → Task 4, markers → Task 5. ✓
- File layout (§8) → matches tasks. ✓
- PWA (§2) → Task 12. ✓
- Deferred items (§9) → not planned, correct. ✓

**Placeholder scan:** No "TBD/TODO/handle edge cases". Every code step has runnable code. Verification steps name exact commands/observations.

**Type consistency:** `TicketStatus`/`TicketType` defined in `lib/status.ts` (Task 3), imported by `lib/health.ts` (Task 4), `StatusControl`/`changeStatus` (Task 10). `Marker = { x; y; label }` defined in `PhotoMarker` (Task 9), consumed identically in `BeforeAfter`, `SiteCapture`, `AddPhoto`. `saveAttachment`/`signedUrl`/`createSiteIssue` signatures match across producer (Tasks 9/11) and consumers. Health `computeHealth(tickets, today)` signature matches dashboard call (Task 7). ✓

**Note (accepted, single-firm scale):** `changeStatus` re-reads the ticket and re-checks `canTransition` server-side (source of truth); the client may display a `→ verified` button that no-ops without an after-photo — acceptable, flagged in Task 10 Step 2.

---

## Execution deviations (2026-09-08, discovered while building)

These differ from the task bodies above; the committed code is the source of truth.

1. **Supabase key = publishable, not anon.** The project uses the new key format, so the env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (value `sb_publishable_…`), not `NEXT_PUBLIC_SUPABASE_ANON_KEY`. All three `lib/supabase/*.ts` and `.env.example` use the publishable name. `SUPABASE_SERVICE_ROLE_KEY` was dropped — signed URLs are generated with the cookie-bound server client, no service role needed.
2. **`@supabase/ssr` must match supabase-js.** ssr 0.5.2 is incompatible with supabase-js 2.48+ (a new `SchemaNameOrClientOptions` generic shifts `SupabaseClient`'s params, so typed tables resolve to `never`). Pinned `@supabase/ssr@^0.12.7` (peer `^2.114.0`) against supabase-js 2.116.
3. **`database.types.ts` empties.** Empty `Views`/`Functions`/`CompositeTypes` must be `{ [_ in never]: never }`, NOT `Record<string, never>` — the latter's string index signature of `never` poisons supabase-js's `Tables & Views` intersection, making every table `never`.
4. **`vitest.config.ts` needs the `@` alias** (`resolve.alias`) so tests resolve `@/lib/*` like the app does. (Omitted from the Task 1 config block.)
5. **Nested-embed casts.** Because the hand-written types have empty `Relationships`, embedded selects (`issue_markers(...)`, `floors(...rooms...)`, `profiles(full_name)`) type as `SelectQueryError`; results are cast through `unknown` (or `never`). Runtime is unaffected. Regenerating with `supabase gen types` later restores full embed typing and lets the casts go.
6. **No `create-next-app`.** Scaffolded config files by hand — the dir already held `docs/` + `.git`, which trips the generator's non-empty-dir guard.
7. **PWA icon is SVG** (`public/icon.svg`, referenced `sizes: "any"`) instead of two PNGs — text-authorable, no binary step.
