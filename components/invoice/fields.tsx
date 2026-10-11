'use client'
import { useState, type TextareaHTMLAttributes, type ReactNode } from 'react'

// Small form helpers for the invoicing screens, matching components/ui (Field/Input/Select).
export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-[4.5rem] rounded border border-subtle bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${className}`}
      {...props}
    />
  )
}

export function Labeled({ label, error, hint, children, className = '' }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-medium text-ink-faint">{label}</span>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
    </label>
  )
}

export function FormMessage({ result }: { result: { ok: boolean; error?: string } | null; okText?: string }) {
  if (!result) return null
  return result.ok ? null : (
    <p role="alert" className="rounded border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{result.error}</p>
  )
}

// Logo / signature: re-encoded in the browser to a small PNG data URL (max 600px) so it can
// live on the profile row and be embedded in every PDF without a storage round trip.
export function ImageField({ name, label, initial }: { name: string; label: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? '')
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File | undefined) {
    setError(null)
    if (!file) return
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setError('Use a PNG, JPG or WebP image')
    try {
      const bmp = await createImageBitmap(file)
      const scale = Math.min(1, 600 / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas')
      c.width = Math.round(bmp.width * scale)
      c.height = Math.round(bmp.height * scale)
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
      let url = c.toDataURL('image/png') // keeps transparency (signatures)
      if (url.length > 380_000) url = c.toDataURL('image/jpeg', 0.85)
      if (url.length > 380_000) return setError('Image is too detailed — try a simpler or smaller file')
      setValue(url)
    } catch {
      setError('Could not read that image')
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-faint">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-28 place-items-center rounded border border-dashed border-line bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" className="max-h-12 max-w-[6.5rem] object-contain" /> : <span className="text-xs text-ink-faint">None</span>}
        </div>
        <label className="cursor-pointer text-sm text-primary hover:underline">
          {value ? 'Replace' : 'Upload'}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {value && (
          <button type="button" onClick={() => setValue('')} className="text-sm text-ink-muted hover:text-danger">
            Remove
          </button>
        )}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
