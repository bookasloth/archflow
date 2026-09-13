'use client'
import { useState, type ReactNode } from 'react'

// Keeps the Work view calm: New-ticket and Filters are hidden behind buttons, so the
// default screen is just the toolbar + the tickets. Sort/Group/Properties + view switch
// stay inline (they're already compact popovers).
export function WorkToolbar({
  newForm, filters, controls, switcher, activeFilters = 0,
}: {
  newForm: ReactNode
  filters: ReactNode
  controls?: ReactNode
  switcher: ReactNode
  activeFilters?: number
}) {
  const [showNew, setShowNew] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowNew((v) => !v)}
          aria-expanded={showNew}
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-fg hover:bg-primary-hover"
        >
          ＋ New ticket
        </button>
        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm ${
            showFilters || activeFilters
              ? 'border-primary-muted bg-primary-soft text-primary'
              : 'border-subtle text-ink-muted hover:bg-surface-hover hover:text-ink'
          }`}
        >
          Filter{activeFilters > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-fg">{activeFilters}</span>}
        </button>
        <div className="ml-auto flex items-center gap-1">
          {controls}
          {switcher}
        </div>
      </div>

      {showNew && (
        <div className="rounded-lg border border-subtle bg-surface p-3">{newForm}</div>
      )}
      {(showFilters || activeFilters > 0) && (
        <div className={showFilters ? '' : 'contents'}>{filters}</div>
      )}
    </div>
  )
}
