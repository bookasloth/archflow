'use client'
import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const VIEWS = ['table', 'kanban', 'calendar', 'timeline'] as const

export function ViewSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  // The view is rendered server-side, so switching is a round trip: show it's working.
  const [pending, startTransition] = useTransition()
  const raw = params.get('view')
  const active = (VIEWS as readonly string[]).includes(raw ?? '') ? raw : 'table'

  function set(view: string) {
    const p = new URLSearchParams(params.toString())
    if (view === 'table') p.delete('view')
    else p.set('view', view)
    startTransition(() => router.replace(`${pathname}?${p.toString()}`))
  }

  return (
    <div
      className={`inline-flex rounded border border-subtle text-sm transition-opacity ${pending ? 'opacity-60' : ''}`}
      role="tablist"
      aria-label="View"
      aria-busy={pending}
    >
      {VIEWS.map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={active === v}
          onClick={() => set(v)}
          className={`px-3 py-1 capitalize first:rounded-l last:rounded-r ${
            active === v ? 'bg-primary-soft text-primary font-medium' : 'text-ink-muted hover:bg-surface-hover'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  )
}
