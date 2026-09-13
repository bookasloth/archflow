'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { IconButton } from '@/components/ui/IconButton'
import { SidebarContent, type ProjectRef } from '@/components/SidebarContent'
import type { Role } from '@/lib/permissions'

// Mobile hamburger + slide-over. Hidden on desktop (Sidebar handles that).
export function MobileNav({ role, projects }: { role?: Role | null; projects: ProjectRef[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on route change.
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="md:hidden">
      <IconButton label="Open navigation" onClick={() => setOpen(true)}>
        <span aria-hidden>☰</span>
      </IconButton>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-subtle bg-surface">
            <div className="flex items-center justify-between px-3 py-3">
              <span className="font-heading text-base font-semibold text-ink">Archflow</span>
              <IconButton label="Close navigation" onClick={() => setOpen(false)}>
                <span aria-hidden>✕</span>
              </IconButton>
            </div>
            <SidebarContent role={role} projects={projects} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  )
}
