'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const VIEWS = ['table', 'kanban'] as const

export function ViewSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const active = params.get('view') === 'kanban' ? 'kanban' : 'table'

  function set(view: string) {
    const p = new URLSearchParams(params.toString())
    if (view === 'table') p.delete('view')
    else p.set('view', view)
    router.replace(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="inline-flex rounded border text-sm" role="tablist" aria-label="View">
      {VIEWS.map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={active === v}
          onClick={() => set(v)}
          className={`px-3 py-1 capitalize first:rounded-l last:rounded-r ${
            active === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  )
}
