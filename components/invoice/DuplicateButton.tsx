'use client'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { duplicateInvoice } from '@/app/(app)/invoice-actions'

export function DuplicateButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState(false)
  return (
    <button
      type="button"
      disabled={pending}
      title={error ? 'Could not duplicate — try again' : 'Copy into a new draft'}
      onClick={() => start(async () => {
        setError(false)
        const r = await duplicateInvoice(id).catch(() => null)
        if (r?.ok) router.push(`/invoices/${r.id}/edit`)
        else setError(true)
      })}
      className={`text-xs hover:underline disabled:opacity-50 ${error ? 'text-danger' : 'text-ink-muted'}`}
    >
      {pending ? 'Copying…' : error ? 'Retry copy' : 'Duplicate'}
    </button>
  )
}
