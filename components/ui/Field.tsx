import type { ReactNode } from 'react'

export function Field({ label, htmlFor, children }: { label?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      {label && <span className="text-[11px] font-medium text-ink-faint">{label}</span>}
      {children}
    </label>
  )
}
