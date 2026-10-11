'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { recordPayment, voidPayment, type Result } from '@/app/(app)/invoice-actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Labeled } from '@/components/invoice/fields'
import { formatINR, rupeesString } from '@/lib/invoice/money'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/invoice/rules'
import { formatDate } from '@/lib/invoice/model'

export type PaymentRow = {
  id: string; paid_on: string; amount: number; method: PaymentMethod; reference: string | null; notes: string | null
  voided_at: string | null; void_reason: string | null
}

export function PaymentsPanel({ invoiceId, payments, balance, canRecord, today }: {
  invoiceId: string; payments: PaymentRow[]; balance: number; canRecord: boolean; today: string
}) {
  const router = useRouter()
  const [result, setResult] = useState<Result | null>(null)
  const [pending, start] = useTransition()
  const [voidError, setVoidError] = useState<string | null>(null)
  const fe = result && !result.ok ? result.fieldErrors ?? {} : {}

  function voidOne(p: PaymentRow) {
    const reason = prompt(`Void the ${formatINR(Number(p.amount))} payment of ${formatDate(p.paid_on)}? It stays in the history, marked void.\n\nReason:`)
    if (reason === null) return
    if (!reason.trim()) return setVoidError('A reason is required')
    setVoidError(null)
    start(async () => {
      const r = await voidPayment(p.id, invoiceId, reason)
      if (!r.ok) setVoidError(r.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {payments.length === 0 ? (
        <p className="text-sm text-ink-faint">No payments recorded.</p>
      ) : (
        <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
          {payments.map((p) => (
            <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 p-2.5 ${p.voided_at ? 'text-ink-faint' : ''}`}>
              <div className="min-w-0">
                <span className={`font-medium tabular-nums ${p.voided_at ? 'line-through' : 'text-ink'}`}>{formatINR(Number(p.amount))}</span>
                <span className="ml-2 text-xs text-ink-muted">
                  {formatDate(p.paid_on)} · {PAYMENT_METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ''}
                </span>
                {p.voided_at && <div className="text-xs">Voided — {p.void_reason}</div>}
                {p.notes && !p.voided_at && <div className="text-xs text-ink-muted">{p.notes}</div>}
              </div>
              {!p.voided_at && <Button size="sm" variant="destructive" disabled={pending} onClick={() => voidOne(p)}>Void</Button>}
            </li>
          ))}
        </ul>
      )}
      {voidError && <p className="text-sm text-danger">{voidError}</p>}

      {canRecord && (
        <form
          action={async (fd) => {
            const r = await recordPayment(fd)
            setResult(r)
            if (r.ok) router.refresh()
          }}
          className="space-y-2 rounded-lg border border-subtle bg-surface p-3"
          key={payments.length /* reset after a successful save */}
        >
          <h3 className="text-sm font-medium">Record a payment</h3>
          {result && !result.ok && <p className="text-sm text-danger">{result.error}</p>}
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <input type="hidden" name="balance" value={balance} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Labeled label="Amount (₹) *" error={fe.amount} hint={`Balance due ${formatINR(balance)}`}>
              <Input name="amount" inputMode="decimal" defaultValue={rupeesString(balance)} required />
            </Labeled>
            <Labeled label="Date *" error={fe.paid_on}><Input name="paid_on" type="date" defaultValue={today} max={today} required /></Labeled>
            <Labeled label="Method *" error={fe.method}>
              <select name="method" defaultValue="upi" className="h-8 rounded border border-subtle bg-surface px-2 text-sm">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
              </select>
            </Labeled>
            <Labeled label="Reference (UTR / cheque no.)"><Input name="reference" /></Labeled>
            <Labeled label="Notes" className="sm:col-span-2"><Input name="notes" /></Labeled>
          </div>
          <SaveButton />
        </form>
      )}
    </div>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()
  return <Button variant="primary" disabled={pending}>{pending ? 'Recording…' : 'Record payment'}</Button>
}
