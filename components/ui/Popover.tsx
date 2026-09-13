'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

// Minimal popover: a trigger button + a dismissable panel (outside-click / Esc).
// Used by the lightweight view controls (sort/group/properties) — no permanent buttons.
export function Popover({
  label, children, align = 'left',
}: {
  label: ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-sm transition-colors ${
          open ? 'bg-surface-hover text-ink' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
        }`}
      >
        {label}
      </button>
      {open && (
        <div
          className={`absolute z-30 mt-1 min-w-[12rem] rounded-lg border border-subtle bg-surface p-1.5 shadow-sm ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  )
}
