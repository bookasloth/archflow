'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const STATUS = ['', 'proposed', 'approved', 'rejected']
const CATEGORY = ['', 'flooring', 'wall_finish', 'ceiling', 'joinery', 'sanitary', 'lighting',
  'hardware', 'paint', 'glazing', 'landscape', 'other']

export function MaterialFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  function set(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.replace(`${pathname}?${p.toString()}`)
  }
  return (
    <div className="flex gap-2 text-sm">
      <select className="rounded border p-1" defaultValue={params.get('status') ?? ''}
        onChange={(e) => set('status', e.target.value)}>
        {STATUS.map((s) => <option key={s} value={s}>{s || 'any status'}</option>)}
      </select>
      <select className="rounded border p-1" defaultValue={params.get('category') ?? ''}
        onChange={(e) => set('category', e.target.value)}>
        {CATEGORY.map((c) => <option key={c} value={c}>{c ? c.replace(/_/g, ' ') : 'any category'}</option>)}
      </select>
    </div>
  )
}
