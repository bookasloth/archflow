// Draft-level rules: validation before save/issue, and what "duplicate" copies.
import { computeInvoice, type InvoiceInput } from '@/lib/invoice/calc'
import type { Paise } from '@/lib/invoice/money'

export type DraftErrors = Record<string, string>

export function validateDraft(input: InvoiceInput & {
  clientId: string | null
  invoiceDate: string | null
  dueDate: string | null
  descriptions: string[]
}): DraftErrors {
  const e: DraftErrors = {}
  if (!input.clientId) e.client = 'Choose a client'
  if (!input.invoiceDate) e.invoiceDate = 'Invoice date is required'
  if (input.dueDate && input.invoiceDate && input.dueDate < input.invoiceDate) e.dueDate = 'Due date is before the invoice date'
  if (input.lines.length === 0) e.lines = 'Add at least one line item'
  input.lines.forEach((l, i) => {
    if (!input.descriptions[i]?.trim()) e[`line${i}.description`] = 'Description is required'
    if (!Number.isInteger(l.qty) || l.qty <= 0) e[`line${i}.qty`] = 'Quantity must be more than 0'
    if (!Number.isInteger(l.rate) || l.rate < 0) e[`line${i}.rate`] = 'Rate cannot be negative'
    if (l.taxRate < 0 || l.taxRate > 10000) e[`line${i}.taxRate`] = 'GST rate must be 0–100%'
    if (l.discount) {
      if (l.discount.value < 0) e[`line${i}.discount`] = 'Discount cannot be negative'
      if (l.discount.kind === 'percent' && l.discount.value > 10000) e[`line${i}.discount`] = 'Discount cannot exceed 100%'
      const base = Math.round((l.qty * l.rate) / 1000)
      if (l.discount.kind === 'fixed' && l.discount.value > base) e[`line${i}.discount`] = 'Discount is more than the line amount'
    }
  })
  if (input.discount) {
    if (input.discount.kind === 'percent' && input.discount.value > 10000) e.discount = 'Discount cannot exceed 100%'
  }
  if (input.advanceAdjusted < 0) e.advance = 'Advance cannot be negative'
  if (input.retention < 0) e.retention = 'Retention cannot be negative'
  if (Object.keys(e).length === 0) {
    const t = computeInvoice(input)
    if (input.discount?.kind === 'fixed' && input.discount.value > t.subtotal - (t.discount - input.discount.value))
      e.discount = 'Discount is more than the invoice amount'
    if (t.payable < 0) e.advance = 'Advance and retention exceed the invoice total'
  }
  return e
}

// Duplicate = a fresh draft with the same lines and terms. Never copies the number,
// share link, payments, dates or issue snapshots.
export function duplicateFields<T extends Record<string, unknown>>(src: T, today: string, dueDays: number) {
  const due = new Date(today + 'T00:00:00Z')
  due.setUTCDate(due.getUTCDate() + dueDays)
  const {
    id, number, prefix, fy, seq, status, issued_at, cancelled_at, cancel_reason, share_token,
    seller, buyer, project_snapshot, created_at, updated_at, created_by, duplicated_from,
    ...rest
  } = src as Record<string, unknown>
  void [number, prefix, fy, seq, status, issued_at, cancelled_at, cancel_reason, share_token, seller, buyer, project_snapshot, created_at, updated_at, created_by, duplicated_from]
  return {
    ...rest,
    status: 'draft' as const,
    invoice_date: today,
    due_date: due.toISOString().slice(0, 10),
    duplicated_from: id as string,
  }
}

// Payment entry rule (the DB re-checks it under a row lock).
export function validatePayment(amount: Paise | null, balance: Paise): string | null {
  if (amount === null || amount <= 0) return 'Enter an amount greater than 0'
  if (amount > balance) return 'Amount is more than the balance due'
  return null
}
