'use client'
import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { workspaceNav, managementNav, adminNav, projectIdFromPath } from '@/lib/nav'
import { isAdmin, type Role } from '@/lib/permissions'

export type ProjectRef = { id: string; name: string }

// Single-column stacked (push/pop) navigation. Clicking a project replaces the list with
// that project's panel + a ‹ back; Work pushes one more level to its views. Shallow areas
// stay flat. Mirrors the approved prototype.
type Panel =
  | { kind: 'root' }
  | { kind: 'project'; id: string; name: string }
  | { kind: 'work'; id: string; name: string }

export function SidebarContent({
  role, projects, favorites = [], recent = [], collapsed = false, onNavigate,
}: {
  role?: Role | null
  projects: ProjectRef[]
  favorites?: ProjectRef[]
  recent?: ProjectRef[]
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const activeId = projectIdFromPath(pathname)
  const activeProject = projects.find((p) => p.id === activeId)

  // Open the active project's panel by default so you land in context.
  const initial: Panel[] = activeProject
    ? [{ kind: 'root' }, { kind: 'project', id: activeProject.id, name: activeProject.name }]
    : [{ kind: 'root' }]
  const [stack, setStack] = useState<Panel[]>(initial)
  useEffect(() => { setStack(initial) }, [activeId, projects.length]) // resync on route/project change
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const top = stack[stack.length - 1]
  const push = (p: Panel) => setStack((s) => [...s, p])
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (/^\/projects\/[^/]+$/.test(href)) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Collapsed rail: icons/first-letters only, no push/pop — projects link straight in.
  if (collapsed) {
    return (
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 pb-4" onClick={onNavigate}>
        {[...workspaceNav, ...managementNav, ...(isAdmin(role) ? adminNav : [])].map((n) => (
          <Link key={n.href} href={n.href} title={n.label} aria-current={isActive(n.href) ? 'page' : undefined}
            className={`my-0.5 flex h-8 items-center justify-center rounded ${isActive(n.href) ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-surface-hover'}`}>
            {n.label[0]}
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <nav aria-label="Primary" className="flex flex-1 flex-col overflow-hidden" onClick={onNavigate}>
      {top.kind !== 'root' && (
        <div className="px-2 pt-1">
          <button onClick={(e) => { e.stopPropagation(); pop() }}
            className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm text-ink-muted hover:bg-surface-hover hover:text-ink">
            <span aria-hidden>‹</span>
            <span className="truncate font-heading font-medium text-ink">{top.kind === 'work' ? 'Work' : top.name}</span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {top.kind === 'root' && (
          <RootPanel
            role={role} projects={projects} favorites={favorites} recent={recent}
            isActive={isActive} activeId={activeId}
            onProject={(p) => push({ kind: 'project', id: p.id, name: p.name })}
          />
        )}
        {top.kind === 'project' && (
          <ProjectPanel id={top.id} isActive={isActive}
            onWork={() => push({ kind: 'work', id: top.id, name: top.name })} />
        )}
        {top.kind === 'work' && <WorkPanel id={top.id} pathname={pathname} />}
      </div>
    </nav>
  )
}

/* ---------- panels ---------- */
function RootPanel({ role, projects, favorites, recent, isActive, activeId, onProject }: {
  role?: Role | null; projects: ProjectRef[]; favorites: ProjectRef[]; recent: ProjectRef[]
  isActive: (h: string) => boolean; activeId: string | null; onProject: (p: ProjectRef) => void
}) {
  return (
    <>
      <Group label="Workspace">
        {workspaceNav.map((n) => <Leaf key={n.href} href={n.href} label={n.label} active={isActive(n.href)} />)}
      </Group>
      {favorites.length > 0 && (
        <Group label="Favorites">
          {favorites.map((p) => <Branch key={p.id} label={p.name} active={activeId === p.id} star onClick={() => onProject(p)} />)}
        </Group>
      )}
      {recent.length > 0 && (
        <Group label="Recent">
          {recent.map((p) => <Branch key={p.id} label={p.name} active={activeId === p.id} onClick={() => onProject(p)} />)}
        </Group>
      )}
      <Group label="Projects">
        {projects.length === 0 && <p className="px-2 py-1 text-xs text-ink-faint">No projects yet.</p>}
        {projects.map((p) => <Branch key={p.id} label={p.name} active={activeId === p.id} onClick={() => onProject(p)} />)}
      </Group>
      <Group label="Management">
        {managementNav.map((n) => <Leaf key={n.href} href={n.href} label={n.label} active={isActive(n.href)} />)}
      </Group>
      {isAdmin(role) && (
        <Group label="Admin">
          {adminNav.map((n) => <Leaf key={n.href} href={n.href} label={n.label} active={isActive(n.href)} />)}
        </Group>
      )}
    </>
  )
}

function ProjectPanel({ id, isActive, onWork }: { id: string; isActive: (h: string) => boolean; onWork: () => void }) {
  const base = `/projects/${id}`
  return (
    <>
      <Group label="Overview"><Leaf href={base} label="Overview" active={isActive(base)} /></Group>
      <Group label="Delivery">
        <Branch label="Work" active={isActive(`${base}/work`)} onClick={onWork} />
        <Leaf href={`${base}/drawings`} label="Drawings" active={isActive(`${base}/drawings`)} />
        <Leaf href={`${base}/docs`} label="Docs" active={isActive(`${base}/docs`)} />
      </Group>
      <Group label="Field">
        <Leaf href={`${base}/work?ktype=site_issue&view=kanban`} label="Site issues" active={false} />
        <Leaf href={`${base}/materials`} label="Materials" active={isActive(`${base}/materials`)} />
      </Group>
    </>
  )
}

function WorkPanel({ id, pathname }: { id: string; pathname: string }) {
  const base = `/projects/${id}/work`
  const onWork = pathname === base || pathname.startsWith(base)
  const views = [
    { label: 'Table', href: base },
    { label: 'Board', href: `${base}?view=kanban` },
    { label: 'Calendar', href: `${base}?view=calendar` },
    { label: 'Timeline', href: `${base}?view=timeline` },
  ]
  return (
    <Group label="Views">
      {views.map((v) => <Leaf key={v.label} href={v.href} label={v.label} active={onWork && v.label === 'Table'} sub />)}
    </Group>
  )
}

/* ---------- primitives ---------- */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
function Leaf({ href, label, active, sub }: { href: string; label: string; active: boolean; sub?: boolean }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
        active ? 'bg-primary-soft font-medium text-primary' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
      }`}>
      {sub && <span className="ml-0.5 inline-block h-1 w-1 rounded-full bg-ink-faint" aria-hidden />}
      <span className="truncate">{label}</span>
    </Link>
  )
}
function Branch({ label, active, star, onClick }: { label: string; active: boolean; star?: boolean; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
        active ? 'bg-primary-soft font-medium text-primary' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
      }`}>
      {star && <span className="text-primary" aria-hidden>★</span>}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-ink-faint" aria-hidden>›</span>
    </button>
  )
}
