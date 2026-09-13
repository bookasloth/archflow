'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SidebarNavItem } from '@/components/ui/SidebarNavItem'
import { IconButton } from '@/components/ui/IconButton'
import { workspaceNav, managementNav, adminNav, projectNav, projectIdFromPath } from '@/lib/nav'
import { isAdmin, type Role } from '@/lib/permissions'

const KEY = 'archflow.sidebar.collapsed'

export function Sidebar({ role }: { role?: Role | null }) {
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

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (/^\/projects\/[^/]+$/.test(href)) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

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

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 pb-4">
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

        {isAdmin(role) && (
          <Section label="Admin" collapsed={collapsed}>
            {adminNav.map((n) => (
              <SidebarNavItem key={n.href} href={n.href} label={n.label} active={isActive(n.href)} collapsed={collapsed} />
            ))}
          </Section>
        )}
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
