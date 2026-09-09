'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const STATUS = ['', 'open', 'in_progress', 'resolved', 'verified', 'closed']
const DISCIPLINE = ['', 'architectural', 'structural', 'electrical', 'plumbing', 'fire_safety',
  'interior', 'landscape', 'construction', 'documentation', 'client_coordination']

export function TicketFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const isKanban = params.get('view') === 'kanban'

  function set(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.replace(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="flex gap-2 text-sm">
      {!isKanban && (
        <select
          className="rounded border p-1"
          defaultValue={params.get('status') ?? ''}
          onChange={(e) => set('status', e.target.value)}
        >
          {STATUS.map((s) => (
            <option key={s} value={s}>{s || 'any status'}</option>
          ))}
        </select>
      )}
      <select
        className="rounded border p-1"
        defaultValue={params.get('discipline') ?? ''}
        onChange={(e) => set('discipline', e.target.value)}
      >
        {DISCIPLINE.map((d) => (
          <option key={d} value={d}>{d || 'any discipline'}</option>
        ))}
      </select>
    </div>
  )
}
