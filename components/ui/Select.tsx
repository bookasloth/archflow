import { forwardRef, type SelectHTMLAttributes } from 'react'

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }
>(function Select({ options, className = '', ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`h-8 rounded border border-subtle bg-surface px-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${className}`}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
})
