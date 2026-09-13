'use client'
import { useEffect, useState } from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { SidebarContent, type ProjectRef } from '@/components/SidebarContent'
import type { Role } from '@/lib/permissions'

const KEY = 'archflow.sidebar.collapsed'

// Desktop sidebar (hidden on mobile — the mobile slide-over is MobileNav).
export function Sidebar({ role, projects }: { role?: Role | null; projects: ProjectRef[] }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(KEY) === '1') } catch {}
  }, [])
  function toggle() {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem(KEY, next ? '1' : '0') } catch {}
      return next
    })
  }

  return (
    <aside
      className={`hidden h-screen shrink-0 flex-col border-r border-subtle bg-surface transition-[width] md:flex ${
        collapsed ? 'w-14' : 'w-60'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3">
        {!collapsed && <span className="font-heading text-base font-semibold text-ink">Archflow</span>}
        <IconButton label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggle}>
          <span aria-hidden>{collapsed ? '»' : '«'}</span>
        </IconButton>
      </div>
      <SidebarContent role={role} projects={projects} collapsed={collapsed} />
    </aside>
  )
}
