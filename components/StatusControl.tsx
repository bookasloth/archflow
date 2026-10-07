'use client'
import { useState, useTransition } from 'react'
import { allowedTransitions, type TicketType, type TicketStatus } from '@/lib/status'
import { statusLabel } from '@/lib/labels'
import { StatusBadge } from '@/components/ui/Badge'
import { changeStatus } from '@/app/(app)/actions'

export function StatusControl({
  id,
  type,
  status,
  onChanged,
}: {
  id: string
  type: TicketType
  status: TicketStatus
  onChanged?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const next = allowedTransitions(type, status)

  function go(to: TicketStatus) {
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('ticket_id', id)
      fd.set('to', to)
      const res = await changeStatus(fd)
      // Surface the server's reason (e.g. "Cannot verify without an after-photo.")
      if (!res.ok) setError(res.error ?? 'Could not change status')
      else onChanged?.()
    })
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={status} />
        {next.map((to) => (
          <button
            key={to}
            disabled={pending}
            onClick={() => go(to)}
            className="rounded border border-subtle px-2 py-1 text-xs text-ink hover:bg-surface-hover disabled:opacity-50"
          >
            → {statusLabel(to)}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
