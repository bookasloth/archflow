'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { issueInvoice, deleteDraft, duplicateInvoice, cancelInvoice } from '@/app/(app)/invoice-actions'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'
import type { StoredStatus } from '@/lib/invoice/rules'

export type ShareInfo = {
  link: string | null // client link; only once issued
  pdfUrl: string
  fileName: string
  title: string // "Tax Invoice INV/2026-27/0001"
  clientName: string
  clientPhone: string | null
  clientEmail: string | null
  message: string // ready-to-send text
}

// WhatsApp wants international digits; Indian 10-digit numbers get 91.
function waNumber(phone: string | null): string {
  const d = (phone ?? '').replace(/\D/g, '')
  if (d.length === 10) return '91' + d
  if (d.length === 11 && d.startsWith('0')) return '91' + d.slice(1)
  return d
}

export function InvoiceActions({ id, status, number, share }: { id: string; status: StoredStatus; number: string | null; share: ShareInfo }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null) // only set after an action really succeeded

  const run = (fn: () => Promise<void>) => {
    setError(null)
    setNote(null)
    start(async () => {
      try { await fn() } catch { setError('Something went wrong — check your connection and try again') }
    })
  }

  const issue = () => {
    if (!confirm('Issue this invoice? It gets the next number and can no longer be edited (you can still duplicate or cancel it).')) return
    run(async () => {
      const r = await issueInvoice(id)
      if (!r.ok) return setError(r.error)
      setNote(`Issued as ${r.number}`)
      router.refresh()
    })
  }
  const remove = () => {
    if (!confirm('Delete this draft? This cannot be undone.')) return
    run(async () => {
      const r = await deleteDraft(id)
      if (!r.ok) return setError(r.error)
      router.push('/invoices')
    })
  }
  const duplicate = () =>
    run(async () => {
      const r = await duplicateInvoice(id)
      if (!r.ok) return setError(r.error)
      router.push(`/invoices/${r.id}/edit`)
    })
  const cancel = () => {
    const reason = prompt(`Cancel ${number}? The number stays used and the document is marked CANCELLED.\n\nReason:`)
    if (reason === null) return
    if (!reason.trim()) return setError('A reason is required to cancel')
    run(async () => {
      const r = await cancelInvoice(id, reason)
      if (!r.ok) return setError(r.error)
      router.refresh()
    })
  }

  async function copy(text: string, what: string) {
    setError(null)
    setNote(null)
    try {
      await navigator.clipboard.writeText(text)
      setNote(`${what} copied`)
    } catch {
      setError('Copy failed — your browser blocked clipboard access')
    }
  }

  // Native share sheet with the PDF file attached (phones). Falls back to sharing the link.
  async function nativeShare() {
    setError(null)
    setNote(null)
    try {
      const res = await fetch(share.pdfUrl)
      if (!res.ok) throw new Error('pdf')
      const file = new File([await res.blob()], share.fileName, { type: 'application/pdf' })
      const data: ShareData = navigator.canShare?.({ files: [file] })
        ? { files: [file], title: share.title, text: share.message }
        : { title: share.title, text: share.message, url: share.link ?? undefined }
      await navigator.share(data)
      setNote('Shared')
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return // user closed the sheet — nothing happened
      setError('Sharing failed on this device — use Download or Copy link instead')
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const wa = `https://wa.me/${waNumber(share.clientPhone)}?text=${encodeURIComponent(share.message)}`
  const mail = `mailto:${encodeURIComponent(share.clientEmail ?? '')}?subject=${encodeURIComponent(share.title)}&body=${encodeURIComponent(share.message)}`

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === 'draft' && (
          <>
            <Button variant="primary" disabled={pending} onClick={issue}>Issue invoice</Button>
            <Link href={`/invoices/${id}/edit`} className="inline-flex h-9 items-center rounded border border-subtle bg-surface px-3.5 text-sm font-medium hover:bg-surface-hover">Edit</Link>
          </>
        )}
        <a href={`${share.pdfUrl}${share.pdfUrl.includes('?') ? '&' : '?'}download=1`} className="inline-flex h-9 items-center rounded border border-subtle bg-surface px-3.5 text-sm font-medium hover:bg-surface-hover">Download PDF</a>
        <a href={share.pdfUrl} target="_blank" rel="noreferrer" title="Opens the PDF in a new tab — print from the viewer" className="inline-flex h-9 items-center rounded border border-subtle bg-surface px-3.5 text-sm font-medium hover:bg-surface-hover">Print</a>

        {status !== 'draft' && (
          <Popover label={<span className="font-medium text-ink">Share ▾</span>}>
            {(close) => (
            <div className="w-64 space-y-1 p-1 text-sm" onClick={close}>
              {canNativeShare && <MenuButton onClick={nativeShare}>Share PDF… <span className="text-xs text-ink-faint">(phone share sheet)</span></MenuButton>}
              <a href={wa} target="_blank" rel="noreferrer" className="block rounded px-2 py-1.5 hover:bg-surface-hover">
                WhatsApp message <span className="block text-xs text-ink-faint">Opens WhatsApp with the text and the PDF link — you press send</span>
              </a>
              <a href={mail} className="block rounded px-2 py-1.5 hover:bg-surface-hover">
                Email <span className="block text-xs text-ink-faint">Opens your mail app{share.clientEmail ? '' : ' (client has no email saved)'}</span>
              </a>
              {share.link && <MenuButton onClick={() => copy(share.link!, 'Client link')}>Copy client link</MenuButton>}
              <MenuButton onClick={() => copy(share.message, 'Summary')}>Copy invoice summary</MenuButton>
            </div>
            )}
          </Popover>
        )}

        <Button disabled={pending} onClick={duplicate}>Duplicate</Button>
        {status === 'draft' && <Button variant="destructive" disabled={pending} onClick={remove}>Delete draft</Button>}
        {status === 'issued' && <Button variant="destructive" disabled={pending} onClick={cancel}>Cancel invoice</Button>}
      </div>
      <div aria-live="polite" className="min-h-5 text-sm">
        {error && <span className="text-danger">{error}</span>}
        {!error && note && <span className="text-success">{note}</span>}
      </div>
    </div>
  )
}

function MenuButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded px-2 py-1.5 text-left hover:bg-surface-hover">
      {children}
    </button>
  )
}
