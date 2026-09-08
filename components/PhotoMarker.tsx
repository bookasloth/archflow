'use client'
import { useRef } from 'react'
import { toNormalized } from '@/lib/markers'

export type Marker = { x: number; y: number; label: string | null }

export function PhotoMarker({
  src,
  value,
  editable,
  onChange,
}: {
  src: string
  value: Marker[]
  editable: boolean
  onChange?: (m: Marker[]) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  function handleClick(e: React.MouseEvent) {
    if (!editable || !onChange || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const n = toNormalized(e.clientX, e.clientY, rect)
    onChange([...value, { x: n.x, y: n.y, label: null }])
  }

  return (
    <div ref={ref} onClick={handleClick} className="relative inline-block select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="max-w-full rounded" />
      {value.map((m, i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 px-2 text-xs text-white shadow"
          style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
          title={m.label ?? ''}
        >
          {i + 1}
        </span>
      ))}
    </div>
  )
}
