import { describe, it, expect } from 'vitest'
import { computeInvoice, allocate, isInterState, type InvoiceInput, type LineInput } from '@/lib/invoice/calc'
import { parseRupees, parsePercent, parseQty, formatINR } from '@/lib/invoice/money'
import { amountInWords } from '@/lib/invoice/words'
import { deriveStatus, financialYear, formatInvoiceNumber, chargesTax } from '@/lib/invoice/rules'
import { validateDraft, duplicateFields, validatePayment } from '@/lib/invoice/draft'

const line = (rupees: number, qty = 1, taxRate = 1800, discount: LineInput['discount'] = null): LineInput => ({
  qty: qty * 1000, rate: rupees * 100, taxRate, discount,
})
const base = (lines: LineInput[], over: Partial<InvoiceInput> = {}): InvoiceInput => ({
  lines, taxMode: 'exclusive', chargesTax: true, supplierState: 'Maharashtra', placeOfSupply: 'Maharashtra',
  discount: null, advanceAdjusted: 0, retention: 0, roundOff: false, ...over,
})

describe('calculation engine', () => {
  it('1. subtotal, CGST+SGST and total for an intra-state tax invoice', () => {
    const t = computeInvoice(base([line(50000), line(4000, 2.5)]))
    expect(t.subtotal).toBe(6_000_000)
    expect(t.taxable).toBe(6_000_000)
    expect(t.cgst).toBe(540_000)
    expect(t.sgst).toBe(540_000)
    expect(t.igst).toBe(0)
    expect(t.total).toBe(7_080_000)
    expect(t.payable).toBe(7_080_000)
  })

  it('2. quantity × rate with decimals rounds half-up in paise (no float drift)', () => {
    const t = computeInvoice(base([{ qty: 1500, rate: 33333, taxRate: 0, discount: null }]))
    expect(t.subtotal).toBe(50000) // 1.5 × 333.33 = 499.995 → 500.00
    const many = computeInvoice(base(Array.from({ length: 10 }, () => ({ qty: 1000, rate: 10, taxRate: 0, discount: null }))))
    expect(many.total).toBe(100) // 10 × ₹0.10 = ₹1.00 exactly
  })

  it('3. percentage and fixed discounts, invoice discount allocated exactly', () => {
    const t = computeInvoice(base([line(10000, 1, 1800, { kind: 'percent', value: 1000 }), line(5000)], {
      discount: { kind: 'fixed', value: 100_000 },
    }))
    expect(t.discount).toBe(100_000 + 100_000) // 10% of 10,000 + ₹1,000
    expect(t.taxable).toBe(1_500_000 - 200_000)
    expect(t.lines.reduce((a, l) => a + l.taxable, 0)).toBe(t.taxable)
    expect(t.cgst + t.sgst).toBe(t.tax)
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33])
    expect(allocate(0, [5, 5])).toEqual([0, 0])
  })

  it('4. tax-inclusive and tax-exclusive pricing agree', () => {
    const inc = computeInvoice(base([line(11800)], { taxMode: 'inclusive' }))
    expect(inc.taxable).toBe(1_000_000)
    expect(inc.tax).toBe(180_000)
    expect(inc.total).toBe(1_180_000)
    const exc = computeInvoice(base([line(10000)]))
    expect(exc.total).toBe(inc.total)
  })

  it('5. intra- vs inter-state presentation follows place of supply, not the supplier alone', () => {
    const inter = computeInvoice(base([line(10000)], { placeOfSupply: 'Karnataka' }))
    expect(inter.interState).toBe(true)
    expect(inter.igst).toBe(180_000)
    expect(inter.cgst + inter.sgst).toBe(0)
    expect(isInterState('Maharashtra', ' maharashtra ')).toBe(false)
    expect(isInterState('Maharashtra', null)).toBe(false)
    // unregistered / non-tax document: no GST even if lines carry a rate
    const none = computeInvoice(base([line(10000)], { chargesTax: false }))
    expect(none.tax).toBe(0)
    expect(chargesTax('tax_invoice', false)).toBe(false)
    expect(chargesTax('bill_of_supply', true)).toBe(false)
    // exempt line alongside a taxed one
    const mixed = computeInvoice(base([line(10000), line(2000, 1, 0)]))
    expect(mixed.slabs.map((x) => x.rate)).toEqual([0, 1800])
    expect(mixed.tax).toBe(180_000)
  })

  it('6. advances and retention reduce payable once; payments are separate', () => {
    const t = computeInvoice(base([line(100000)], { advanceAdjusted: 5_000_000, retention: 500_000 }))
    expect(t.total).toBe(11_800_000)
    expect(t.payable).toBe(11_800_000 - 5_000_000 - 500_000)
    const partial = deriveStatus({ status: 'issued', payable: t.payable, paid: 2_000_000, dueDate: '2099-01-01' }, '2026-10-11')
    expect(partial).toBe('partially_paid')
  })

  it('rounds the grand total to the rupee when asked', () => {
    const t = computeInvoice(base([{ qty: 1000, rate: 1050, taxRate: 1800, discount: null }], { roundOff: true }))
    // 10.50 + 0.95 + 0.95 = 12.40 → 12.00
    expect(t.total).toBe(1200)
    expect(t.roundOff).toBe(-40)
  })
})

describe('7. status', () => {
  const today = '2026-10-11'
  it('fully paid is never overdue; overdue needs a passed due date and a balance', () => {
    expect(deriveStatus({ status: 'issued', payable: 100, paid: 100, dueDate: '2026-01-01' }, today)).toBe('paid')
    expect(deriveStatus({ status: 'issued', payable: 100, paid: 40, dueDate: '2026-10-10' }, today)).toBe('overdue')
    expect(deriveStatus({ status: 'issued', payable: 100, paid: 0, dueDate: '2026-10-11' }, today)).toBe('issued')
    expect(deriveStatus({ status: 'draft', payable: 100, paid: 0, dueDate: '2026-01-01' }, today)).toBe('draft')
    expect(deriveStatus({ status: 'cancelled', payable: 100, paid: 0, dueDate: '2026-01-01' }, today)).toBe('cancelled')
  })
})

describe('8. numbering', () => {
  it('formats sequential numbers per Indian financial year', () => {
    expect(financialYear('2026-03-31')).toBe('2025-26')
    expect(financialYear('2026-04-01')).toBe('2026-27')
    expect(formatInvoiceNumber('INV', '2026-27', 7)).toBe('INV/2026-27/0007')
    expect(formatInvoiceNumber('INV', null, 12)).toBe('INV-0012')
  })
})

describe('9. duplicate', () => {
  it('copies lines/terms but never the number, link, snapshots or dates', () => {
    const d = duplicateFields(
      { id: 'a', number: 'INV/2026-27/0001', status: 'issued', share_token: 't', seller: {}, notes: 'n', tax_mode: 'exclusive', invoice_date: '2026-04-02' },
      '2026-10-11', 15,
    )
    expect(d).toMatchObject({ status: 'draft', notes: 'n', tax_mode: 'exclusive', invoice_date: '2026-10-11', due_date: '2026-10-26', duplicated_from: 'a' })
    expect('number' in d).toBe(false)
    expect('share_token' in d).toBe(false)
    expect('seller' in d).toBe(false)
  })
})

describe('10. input validation', () => {
  it('parses money/percent/qty strictly (no negatives, no floats)', () => {
    expect(parseRupees('1,23,456.7')).toBe(12_345_670)
    expect(parseRupees('-5')).toBeNull()
    expect(parseRupees('1.234')).toBeNull()
    expect(parseRupees('abc')).toBeNull()
    expect(parsePercent('18')).toBe(1800)
    expect(parsePercent('2.5')).toBe(250)
    expect(parsePercent('101')).toBeNull()
    expect(parseQty('1.5')).toBe(1500)
    expect(parseQty('-1')).toBeNull()
  })
  it('rejects bad drafts', () => {
    const e = validateDraft({
      ...base([{ qty: 0, rate: -1, taxRate: 1800, discount: null }], { advanceAdjusted: -1 }),
      clientId: null, invoiceDate: '2026-10-11', dueDate: '2026-10-01', descriptions: [''],
    })
    expect(Object.keys(e).sort()).toEqual(['advance', 'client', 'dueDate', 'line0.description', 'line0.qty', 'line0.rate'].sort())
    const tooMuchAdvance = validateDraft({
      ...base([line(1000)], { advanceAdjusted: 10_000_000 }),
      clientId: 'c', invoiceDate: '2026-10-11', dueDate: null, descriptions: ['Fee'],
    })
    expect(tooMuchAdvance.advance).toBeTruthy()
    expect(validatePayment(0, 100)).toBeTruthy()
    expect(validatePayment(101, 100)).toBeTruthy()
    expect(validatePayment(100, 100)).toBeNull()
  })
})

describe('formatting', () => {
  it('Indian grouping and words', () => {
    expect(formatINR(12_345_678)).toBe('₹ 1,23,456.78')
    expect(amountInWords(12_345_678)).toBe('Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty-Six and Seventy-Eight Paise Only')
    expect(amountInWords(1_000_000_000)).toBe('Rupees One Crore Only')
    expect(amountInWords(0)).toBe('Rupees Zero Only')
  })
})
