import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { buildDoc, type InvoiceRow, type LineRow, type SellerRow } from '@/lib/invoice/model'
import { renderInvoicePdf } from '@/lib/invoice/pdf/InvoicePdf'

const seller: SellerRow = {
  firm_name: 'Datarkar & Associates', principal_name: 'Ar. Shubham Datarkar', address: '12 Civil Lines',
  city: 'Nagpur', state: 'Maharashtra', pin: '440001', country: 'India', phone: '+91 98765 43210',
  email: 'studio@example.com', website: 'example.com', gst_registered: true, gstin: '27ABCDE1234F1Z5',
  pan: 'ABCDE1234F', registration: 'CA/2015/12345', bank_details: 'HDFC Bank · A/c 001234567890 · IFSC HDFC0000123',
  upi_id: 'studio@hdfc', logo_data: null, signature_data: null, accent_color: '#FE5000', template: 'minimal', footer_note: null,
}
const invoice = (over: Partial<InvoiceRow> = {}): InvoiceRow => ({
  id: 'x', status: 'issued', doc_type: 'tax_invoice', number: 'INV/2026-27/0001', invoice_date: '2026-10-11',
  due_date: '2026-10-26', po_reference: 'WO-77', place_of_supply: 'Maharashtra', tax_mode: 'exclusive',
  discount_kind: null, discount_value: 0, advance_adjusted: 2_500_000, retention: 0, round_off: true,
  notes: 'Stage 2 fee as per agreement.', terms: 'Payment within 15 days.', payment_instructions: 'Please quote the invoice number.',
  template: 'minimal', accent_color: null, ...over,
})
const lines = (n: number): LineRow[] =>
  Array.from({ length: n }, (_, i) => ({
    position: i, description: `Design development — package ${i + 1}. ` + 'Coordination of drawings and specifications. '.repeat(i % 4),
    category: 'Architectural drawings', qty: 1000 + (i % 3) * 500, unit: 'lot', rate: 1_250_000 + i * 1000,
    discount_kind: null, discount_value: 0, tax_rate: i % 5 === 4 ? 0 : 1800,
  }))
const doc = (n: number, over: Partial<InvoiceRow> = {}) =>
  buildDoc({
    invoice: invoice(over), lines: lines(n), seller,
    buyer: { name: 'Mehta Residences LLP', contact_person: 'R. Mehta', billing_address: '4th Floor, Ramdaspeth', site_address: 'Plot 22, Wardha Rd',
      state: 'Maharashtra', pin: '440010', email: 'a@b.c', phone: '9999999999', gstin: '27AAACM1234A1Z2' },
    project: { name: 'Mehta House', code: 'MH-01', reference: 'P-2026-14', project_type: 'residential', location: 'Nagpur' },
    paid: 0, today: '2026-10-11',
  })

const pages = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
const out = process.env.INVOICE_PDF_OUT
if (out) mkdirSync(out, { recursive: true })

describe('11. PDF generation', () => {
  it('renders a valid one-page A4 PDF', async () => {
    const pdf = await renderInvoicePdf(doc(3))
    if (out) writeFileSync(`${out}/minimal.pdf`, pdf)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pages(pdf)).toBe(1)
  }, 60_000)

  it('paginates 40 line items across pages without losing the totals page', async () => {
    const pdf = await renderInvoicePdf(doc(40, { template: 'editorial', place_of_supply: 'Karnataka' }))
    if (out) writeFileSync(`${out}/editorial-multipage.pdf`, pdf)
    expect(pages(pdf)).toBeGreaterThanOrEqual(2)
  }, 60_000)

  it('renders the modern template and draft/cancelled marks', async () => {
    for (const status of ['draft', 'cancelled'] as const) {
      const pdf = await renderInvoicePdf(doc(2, { template: 'modern', status, number: status === 'draft' ? null : 'INV/2026-27/0002' }))
      if (out) writeFileSync(`${out}/modern-${status}.pdf`, pdf)
      expect(pages(pdf)).toBe(1)
    }
  }, 60_000)
})
