'use client'
import { usePathname } from 'next/navigation'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import type { ProjectRef } from '@/components/SidebarContent'

const TOP: Record<string, string> = {
  '': 'Home',
  'my-work': 'My Work',
  approvals: 'Approvals',
  activity: 'Activity',
  reports: 'Reports',
  site: 'Site Visit',
  drawings: 'Drawing',
  materials: 'Material',
  tickets: 'Ticket',
  docs: 'Pages',
  admin: 'Admin',
}
const PROJECT_SUB: Record<string, string> = {
  work: 'Work', drawings: 'Drawings', materials: 'Materials', rooms: 'Room', docs: 'Docs',
}

// Contextual wayfinding in the top bar. Page bodies still own their H1 (PageHeader);
// this answers "where am I" without a giant repeated header.
export function HeaderBreadcrumb({ projects }: { projects: ProjectRef[] }) {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  const items: { label: string; href?: string }[] = [{ label: 'Archflow', href: '/' }]

  if (parts.length === 0) return null // Home: the page title carries it

  if (parts[0] === 'projects' && parts[1]) {
    const name = projects.find((p) => p.id === parts[1])?.name ?? 'Project'
    items.push({ label: name, href: `/projects/${parts[1]}` })
    if (parts[2]) items.push({ label: PROJECT_SUB[parts[2]] ?? parts[2] })
  } else {
    items.push({ label: TOP[parts[0]] ?? parts[0] })
    if (parts[0] === 'admin' && parts[1] === 'users') items.push({ label: 'Users' })
  }

  // Last crumb is the current page — drop its href.
  const last = items[items.length - 1]
  if (last) last.href = undefined

  return <Breadcrumb items={items} />
}
