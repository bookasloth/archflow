// Turns database rows into the document every renderer uses (PDF, detail page, share text).
// Drafts read the live business profile / client / project; issued invoices read the
// snapshots frozen by issue_invoice(), so later profile edits never change a sent document.
import { computeInvoice, type InvoiceInput, type InvoiceTotals, type TaxMode, type Discount } from '@/lib/invoice/calc'
import { amountInWords } from '@/lib/invoice/words'
import { chargesTax, deriveStatus, DOC_TYPES, todayIST, type DocType, type InvoiceStatus, type StoredStatus } from '@/lib/invoice/rules'
import type { Paise } from '@/lib/invoice/money'

export type SellerRow = {
  firm_name: string; principal_name: string | null
  address: string | null; city: string | null; state: string | null; pin: string | null; country: string | null
  phone: string | null; email: string | null; website: string | null
  gst_registered: boolean; gstin: string | null; pan: string | null; registration: string | null
  bank_details: string | null; upi_id: string | null
  logo_data: string | null; signature_data: string | null
  accent_color: string; template: string; footer_note: string | null
}
export type BuyerRow = {
  name: string; contact_person: string | null; billing_address: string | null; site_address: string | null
  state: string | null; pin: string | null; email: string | null; phone: string | null; gstin: string | null
}
export type ProjectRow = { name: string; code: string | null; reference: string | null; project_type: string | null; location: string | null }
export type InvoiceRow = {
  id: string; status: StoredStatus; doc_type: DocType; number: string | null
  invoice_date: string; due_date: string | null; po_reference: string | null; place_of_supply: string | null
  tax_mode: TaxMode; discount_kind: 'percent' | 'fixed' | null; discount_value: number
  advance_adjusted: number; retention: number; round_off: boolean
  notes: string | null; terms: string | null; payment_instructions: string | null
  template: string; accent_color: string | null
  cancel_reason?: string | null
}
export type LineRow = {
  position: number; description: string; category: string | null; qty: number; unit: string | null
  rate: number; discount_kind: 'percent' | 'fixed' | null; discount_value: number; tax_rate: number
}

export type Template = 'minimal' | 'editorial' | 'modern'

export type InvoiceDoc = {
  title: string
  number: string | null // null = draft
  status: InvoiceStatus
  cancelReason: string | null
  invoiceDate: string
  dueDate: string | null
  poReference: string | null
  placeOfSupply: string | null
  chargesTax: boolean
  taxMode: TaxMode
  seller: SellerRow
  buyer: BuyerRow
  project: ProjectRow | null
  lines: (LineRow & { taxable: Paise; tax: Paise; total: Paise; discount: Paise; base: Paise })[]
  totals: InvoiceTotals
  paid: Paise
  balance: Paise
  words: string
  notes: string | null
  terms: string | null
  paymentInstructions: string | null
  template: Template
  accent: string
}

const discountOf = (kind: 'percent' | 'fixed' | null, value: number): Discount | null =>
  kind && value > 0 ? { kind, value } : null

export function calcInput(inv: Omit<InvoiceRow, 'id' | 'status' | 'number' | 'notes' | 'terms' | 'payment_instructions' | 'template' | 'accent_color' | 'invoice_date' | 'due_date' | 'po_reference'>, lines: Pick<LineRow, 'qty' | 'rate' | 'discount_kind' | 'discount_value' | 'tax_rate'>[], seller: { gst_registered: boolean; state: string | null }): InvoiceInput {
  return {
    lines: lines.map((l) => ({ qty: l.qty, rate: l.rate, discount: discountOf(l.discount_kind, l.discount_value), taxRate: l.tax_rate })),
    taxMode: inv.tax_mode,
    chargesTax: chargesTax(inv.doc_type, seller.gst_registered),
    supplierState: seller.state,
    placeOfSupply: inv.place_of_supply,
    discount: discountOf(inv.discount_kind, inv.discount_value),
    advanceAdjusted: inv.advance_adjusted,
    retention: inv.retention,
    roundOff: inv.round_off,
  }
}

export function buildDoc(args: {
  invoice: InvoiceRow
  lines: LineRow[]
  seller: SellerRow
  buyer: BuyerRow
  project: ProjectRow | null
  paid: Paise
  today?: string
}): InvoiceDoc {
  const { invoice: inv, seller } = args
  const lines = [...args.lines].sort((a, b) => a.position - b.position)
  const totals = computeInvoice(calcInput(inv, lines, seller))
  const template = (['minimal', 'editorial', 'modern'].includes(inv.template) ? inv.template : 'minimal') as Template
  return {
    title: DOC_TYPES[inv.doc_type].label,
    number: inv.number,
    status: deriveStatus({ status: inv.status, payable: totals.payable, paid: args.paid, dueDate: inv.due_date }, args.today ?? todayIST()),
    cancelReason: inv.cancel_reason ?? null,
    invoiceDate: inv.invoice_date,
    dueDate: inv.due_date,
    poReference: inv.po_reference,
    placeOfSupply: inv.place_of_supply,
    chargesTax: chargesTax(inv.doc_type, seller.gst_registered),
    taxMode: inv.tax_mode,
    seller,
    buyer: args.buyer,
    project: args.project,
    lines: lines.map((l, i) => ({ ...l, ...totals.lines[i] })),
    totals,
    paid: args.paid,
    balance: Math.max(0, totals.payable - args.paid),
    words: amountInWords(totals.payable),
    notes: inv.notes,
    terms: inv.terms,
    paymentInstructions: inv.payment_instructions,
    template,
    accent: inv.accent_color ?? seller.accent_color ?? '#FE5000',
  }
}

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
