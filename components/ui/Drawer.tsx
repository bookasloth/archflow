'use client'
import { useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

// Shared right-side panel for ticket + drawing details: backdrop click / Esc close,
// focus on open, body scroll lock, slide-in. Render it only while open.
export function Drawer({
  label,
  onClose,
  children,
}: {
  label: string
  onClose: () => void
  children: React.ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={() => onCloseRef.current()} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="absolute right-0 top-0 h-full w-full max-w-md animate-drawer-in overflow-y-auto bg-surface p-5 shadow-xl motion-reduce:animate-none"
      >
        <button
          ref={closeRef}
          onClick={() => onCloseRef.current()}
          className="mb-3 text-sm text-ink-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        >
          ✕ Close
        </button>
        {children}
      </aside>
    </div>
  )
}

// Shown the instant a drawer opens, so the panel never feels stuck while data loads.
export function DrawerSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="divide-y divide-subtle rounded border border-subtle">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
