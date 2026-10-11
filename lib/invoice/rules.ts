// Invoice lifecycle rules shared by the dashboard, detail page, PDF and server actions.
import type { Paise } from '@/lib/invoice/money'

export type StoredStatus = 'draft' | 'issued' | 'cancelled'
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

// Derived, never stored: a fully paid invoice is never overdue; overdue = issued, money
// still owed, and the due date (inclusive) has passed. today = 'YYYY-MM-DD' in IST.
export function deriveStatus(
  inv: { status: StoredStatus; payable: Paise; paid: Paise; dueDate: string | null },
  today: string,
): InvoiceStatus {
  if (inv.status !== 'issued') return inv.status
  if (inv.paid >= inv.payable) return 'paid'
  if (inv.dueDate && inv.dueDate < today) return 'overdue'
  if (inv.paid > 0) return 'partially_paid'
  return 'issued'
}

export const todayIST = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now) // YYYY-MM-DD

// Indian financial year (April–March): 2026-10-11 -> "2026-27".
export function financialYear(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number)
  const start = m >= 4 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

// Mirrors public.format_invoice_number() in the 0011 migration (the DB is authoritative;
// this is for previews like "next number will be …").
export function formatInvoiceNumber(prefix: string, fy: string | null, seq: number): string {
  const n = String(seq).padStart(4, '0')
  return fy ? `${prefix}/${fy}/${n}` : `${prefix}-${n}`
}

export const DOC_TYPES = {
  tax_invoice: { label: 'Tax Invoice', chargesTax: true, needsGstin: true },
  invoice: { label: 'Invoice', chargesTax: false, needsGstin: false },
  bill_of_supply: { label: 'Bill of Supply', chargesTax: false, needsGstin: false },
  proforma: { label: 'Proforma Invoice', chargesTax: true, needsGstin: false },
} as const
export type DocType = keyof typeof DOC_TYPES

// Tax is charged only when the business is GST-registered AND the document type charges it.
export const chargesTax = (docType: DocType, gstRegistered: boolean) =>
  gstRegistered && DOC_TYPES[docType].chargesTax

export const SERVICE_CATEGORIES = [
  'Architectural consultation',
  'Concept design',
  'Site analysis and feasibility study',
  'Floor plan design',
  'Architectural drawings',
  '3D visualization and rendering',
  'Structural coordination',
  'Interior design',
  'Working drawings',
  'Site visits and supervision',
  'Project management',
  'Design revisions',
  'Consultancy fees',
  'Reimbursable expenses',
  'Other professional services',
] as const

export const PAYMENT_METHODS = ['upi', 'bank_transfer', 'cash', 'cheque', 'card', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: 'UPI', bank_transfer: 'Bank transfer', cash: 'Cash', cheque: 'Cheque', card: 'Card', other: 'Other',
}

export const PROJECT_TYPES = ['residential', 'commercial', 'institutional', 'hospitality', 'interior_design', 'renovation', 'other'] as const

// Indian states + UTs for place of supply (names; GST state codes in comments are not needed for v1).
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Other Territory',
] as const
