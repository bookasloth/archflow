'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { workspaceNav, managementNav } from '@/lib/nav'
import { globalSearch, type SearchHit } from '@/app/(app)/search-actions'

type Row = { key: string; group: string; label: string; href: string }

const NAV: { label: string; href: string }[] = [
  ...workspaceNav,
  ...managementNav,
  { label: 'Site Visit', href: '/site' },
]

export function CommandMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K toggles the menu from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQ('')
      setHits([])
      setSel(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Debounced cross-entity search.
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return }
    const id = setTimeout(() => { globalSearch(q).then(setHits) }, 200)
    return () => clearTimeout(id)
  }, [q])

  const navMatches = NAV.filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase()))
  const rows: Row[] = [
    ...navMatches.map((n) => ({ key: `nav-${n.href}`, group: 'Go to', label: n.label, href: n.href })),
    ...hits.map((h) => ({ key: h.id, group: h.kind, label: h.label, href: h.href })),
  ]
  useEffect(() => { setSel(0) }, [q, hits.length])

  const go = useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, rows.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (rows[sel]) go(rows[sel].href) }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-subtle bg-surface px-2.5 py-1 text-sm text-ink-faint hover:bg-surface-hover"
      >
        <span>Search…</span>
        <kbd className="rounded border border-subtle px-1 text-[10px] text-ink-faint">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command menu">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-subtle bg-surface shadow-xl">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search projects, tickets, drawings, materials…"
              className="w-full border-b border-subtle bg-surface px-4 py-3 text-sm outline-none"
            />
            <ul className="max-h-80 overflow-y-auto py-1">
              {rows.length === 0 && (
                <li className="px-4 py-3 text-sm text-ink-faint">
                  {q.trim().length < 2 ? 'Type to search, or pick a destination.' : 'No matches.'}
                </li>
              )}
              {rows.map((r, i) => (
                <li key={r.key}>
                  <button
                    onClick={() => go(r.href)}
                    onMouseEnter={() => setSel(i)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                      i === sel ? 'bg-surface-hover' : ''
                    }`}
                  >
                    <span className="truncate text-ink">{r.label}</span>
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-ink-faint">{r.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
