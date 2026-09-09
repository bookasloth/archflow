import { forwardRef, type ButtonHTMLAttributes } from 'react'

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(function IconButton({ label, className = '', children, ...props }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})
