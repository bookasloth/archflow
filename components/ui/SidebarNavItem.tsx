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
