import Link from 'next/link'
import { Fragment } from 'react'

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted">
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-ink-faint">/</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-ink">{it.label}</Link>
          ) : (
            <span className="text-ink">{it.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
