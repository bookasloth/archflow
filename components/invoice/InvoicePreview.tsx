'use client'
import { useState } from 'react'
import type { Template } from '@/lib/invoice/model'

const T: { k: Template; label: string }[] = [
  { k: 'minimal', label: 'Minimal Studio' },
  { k: 'editorial', label: 'Editorial' },
  { k: 'modern', label: 'Modern' },
]

// The preview IS the PDF (same renderer as Download) — no second HTML layout to drift.
// Phones can't show PDFs inline, so they get an "Open preview" button instead.
export function InvoicePreview({ pdfUrl, initial }: { pdfUrl: string; initial: Template }) {
  const [t, setT] = useState<Template>(initial)
  const [loading, setLoading] = useState(true)
  const src = `${pdfUrl}?template=${t}`
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Template">
        {T.map((x) => (
          <button
            key={x.k}
            role="tab"
            aria-selected={t === x.k}
            onClick={() => { setT(x.k); setLoading(true) }}
            className={`rounded px-2.5 py-1 text-xs ${t === x.k ? 'bg-primary-soft font-medium text-primary' : 'text-ink-muted hover:bg-surface-hover'}`}
          >
            {x.label}
          </button>
        ))}
        {t !== initial && (
          <a href={`${src}&download=1`} className="ml-1 text-xs text-primary hover:underline">Download in this template</a>
        )}
      </div>
      <div className="relative hidden md:block">
        {loading && <div className="absolute inset-0 grid place-items-center rounded-lg border border-subtle bg-surface text-sm text-ink-faint">Rendering PDF…</div>}
        <iframe key={src} src={`${src}#view=FitH`} title="Invoice preview" onLoad={() => setLoading(false)} className="h-[80vh] w-full rounded-lg border border-subtle bg-white" />
      </div>
      <a href={src} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded border border-subtle bg-surface px-3.5 text-sm font-medium md:hidden">
        Open preview (PDF)
      </a>
    </div>
  )
}
