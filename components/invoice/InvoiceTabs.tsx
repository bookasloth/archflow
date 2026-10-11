'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/invoices', label: 'Invoices' },
  { href: '/invoices/clients', label: 'Clients' },
  { href: '/invoices/projects', label: 'Projects' },
  { href: '/invoices/settings', label: 'Settings' },
]

export function InvoiceTabs() {
  const pathname = usePathname()
  const active = (href: string) =>
    href === '/invoices'
      ? pathname === '/invoices' || (/^\/invoices\/(new|[0-9a-f-]{36})/.test(pathname))
      : pathname.startsWith(href)
  return (
    <nav aria-label="Invoicing" className="-mx-1 flex gap-1 overflow-x-auto border-b border-subtle">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={active(t.href) ? 'page' : undefined}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
            active(t.href) ? 'border-primary font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
