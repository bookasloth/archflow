export type NavLink = { label: string; href: string }

export const workspaceNav: NavLink[] = [
  { label: 'Overview', href: '/' },
  { label: 'My Work', href: '/my-work' },
  { label: 'Approvals', href: '/approvals' },
  { label: 'Pages', href: '/docs' },
]

export const managementNav: NavLink[] = [
  { label: 'Reports', href: '/reports' },
  { label: 'Activity', href: '/activity' },
]

// Admin-only; the sidebar renders this section only for admins.
export const adminNav: NavLink[] = [
  { label: 'Users', href: '/admin/users' },
]

export function projectNav(projectId: string): NavLink[] {
  return [
    { label: 'Overview', href: `/projects/${projectId}` },
    { label: 'Work', href: `/projects/${projectId}/work` },
    { label: 'Drawings', href: `/projects/${projectId}/drawings` },
    { label: 'Site', href: `/site` },
    { label: 'Materials', href: `/projects/${projectId}/materials` },
    { label: 'Docs', href: `/projects/${projectId}/docs` },
  ]
}

// Extract the active project id from a pathname like /projects/<id>/...
export function projectIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/projects\/([^/]+)/)
  return m ? m[1] : null
}
