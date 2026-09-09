'use client'
import { allowedTransitions, type TicketType, type TicketStatus } from '@/lib/status'
import { changeStatusForm } from '@/app/(app)/actions'

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
  const next = allowedTransitions(type, status)
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded bg-gray-100 px-2 py-1">{status}</span>
      {next.map((to) => (
        <form
          key={to}
          action={async (fd) => {
            await changeStatusForm(fd)
            onChanged?.()
          }}
        >
          <input type="hidden" name="ticket_id" value={id} />
          <input type="hidden" name="to" value={to} />
          <button className="rounded border px-2 py-1">→ {to}</button>
        </form>
      ))}
    </div>
  )
}
