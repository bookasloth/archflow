'use client'
import { usePathname } from 'next/navigation'
import { SidebarNavItem } from '@/components/ui/SidebarNavItem'
import { workspaceNav, managementNav, adminNav, projectNav, projectIdFromPath } from '@/lib/nav'
import { isAdmin, type Role } from '@/lib/permissions'

export type ProjectRef = { id: string; name: string }

// The nav body shared by the desktop Sidebar and the mobile slide-over.
// `collapsed` only applies on desktop; the mobile drawer always renders expanded.
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
  const activeProject = projectIdFromPath(pathname)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (/^\/projects\/[^/]+$/.test(href)) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 pb-4" onClick={onNavigate}>
      <Section label="Workspace" collapsed={collapsed}>
        {workspaceNav.map((n) => (
          <SidebarNavItem key={n.href} href={n.href} label={n.label} active={isActive(n.href)} collapsed={collapsed} />
        ))}
      </Section>

      {favorites.length > 0 && (
        <Section label="Favorites" collapsed={collapsed}>
          {favorites.map((p) => (
            <SidebarNavItem key={p.id} href={`/projects/${p.id}`} label={p.name} active={pathname === `/projects/${p.id}`} collapsed={collapsed} />
          ))}
        </Section>
      )}

      {recent.length > 0 && !collapsed && (
        <Section label="Recent" collapsed={collapsed}>
          {recent.map((p) => (
            <SidebarNavItem key={p.id} href={`/projects/${p.id}`} label={p.name} active={pathname === `/projects/${p.id}`} collapsed={collapsed} />
          ))}
        </Section>
      )}

      <Section label="Projects" collapsed={collapsed}>
        {projects.length === 0 && !collapsed && (
          <p className="px-2 py-1 text-xs text-ink-faint">No projects yet.</p>
        )}
        {projects.map((p) => {
          const href = `/projects/${p.id}`
          const active = activeProject === p.id
          return (
            <div key={p.id}>
              <SidebarNavItem href={href} label={p.name} active={pathname === href} collapsed={collapsed} />
              {active && !collapsed && (
                <div className="ml-3 border-l border-subtle pl-2">
                  {projectNav(p.id).map((s) => (
                    <SidebarNavItem key={s.href} href={s.href} label={s.label} active={isActive(s.href)} collapsed={false} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </Section>

      <Section label="Management" collapsed={collapsed}>
        {managementNav.map((n) => (
          <SidebarNavItem key={n.href} href={n.href} label={n.label} active={isActive(n.href)} collapsed={collapsed} />
        ))}
      </Section>

      {isAdmin(role) && (
        <Section label="Admin" collapsed={collapsed}>
          {adminNav.map((n) => (
            <SidebarNavItem key={n.href} href={n.href} label={n.label} active={isActive(n.href)} collapsed={collapsed} />
          ))}
        </Section>
      )}
    </nav>
  )
}

function Section({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {!collapsed && (
        <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint truncate">{label}</div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
