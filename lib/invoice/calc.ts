// The one invoice calculation engine. The editor, the PDF and the stored totals all call
// computeInvoice(), so screen, document and database can't disagree.
//
// Tax logic is configurable, not a statement of law: rates are per line, the CGST+SGST vs
// IGST split follows "supplier state vs place of supply", and an unregistered business
// charges no GST. Verify rates, place of supply and document type with a professional.
import { divRound, mulDivRound, type Paise } from '@/lib/invoice/money'

export type TaxMode = 'exclusive' | 'inclusive'
export type DiscountKind = 'percent' | 'fixed'
export type Discount = { kind: DiscountKind; value: number } // percent: bps, fixed: paise

export type LineInput = {
  qty: number // thousandths (1.5 units = 1500)
  rate: Paise // per unit; tax-inclusive when taxMode = 'inclusive'
  discount: Discount | null
  taxRate: number // bps, 0 = exempt / nil-rated
}

export type InvoiceInput = {
  lines: LineInput[]
  taxMode: TaxMode
  chargesTax: boolean // GST-registered and the document type charges tax
  supplierState: string | null
  placeOfSupply: string | null
  discount: Discount | null // invoice-level, spread across lines before tax
  advanceAdjusted: Paise // received before this invoice; deducted once, here
  retention: Paise
  roundOff: boolean
}

export type LineResult = {
  base: Paise // qty × rate
  discount: Paise // line + share of invoice-level discount
  taxable: Paise
  cgst: Paise
  sgst: Paise
  igst: Paise
  tax: Paise
  total: Paise // taxable + tax
}

export type TaxSlab = { rate: number; taxable: Paise; cgst: Paise; sgst: Paise; igst: Paise }

export type InvoiceTotals = {
  lines: LineResult[]
  interState: boolean
  subtotal: Paise // Σ base
  discount: Paise
  taxable: Paise
  cgst: Paise
  sgst: Paise
  igst: Paise
  tax: Paise
  roundOff: Paise // signed
  total: Paise // invoice total
  advanceAdjusted: Paise
  retention: Paise
  payable: Paise // what this invoice asks the client to pay
  slabs: TaxSlab[]
}

const norm = (s: string | null) => (s ?? '').trim().toLowerCase()

export function isInterState(supplierState: string | null, placeOfSupply: string | null): boolean {
  return !!norm(supplierState) && !!norm(placeOfSupply) && norm(supplierState) !== norm(placeOfSupply)
}

function discountOn(amount: Paise, d: Discount | null): Paise {
  if (!d || d.value <= 0) return 0
  const v = d.kind === 'percent' ? mulDivRound(amount, d.value, 10000) : d.value
  return Math.min(v, amount)
}

// Split `amount` across `weights` proportionally; remainders go to the largest fractions
// so the parts always sum to exactly `amount`.
export function allocate(amount: Paise, weights: Paise[]): Paise[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (amount <= 0 || sum <= 0) return weights.map(() => 0)
  const exact = weights.map((w) => BigInt(amount) * BigInt(w))
  const parts = exact.map((e) => Number(e / BigInt(sum)))
  let rest = amount - parts.reduce((a, b) => a + b, 0)
  const order = exact
    .map((e, i) => ({ i, r: Number(e % BigInt(sum)) }))
    .sort((a, b) => b.r - a.r || a.i - b.i)
  for (let k = 0; rest > 0; k++, rest--) parts[order[k % order.length].i]++
  return parts
}

export function computeInvoice(input: InvoiceInput): InvoiceTotals {
  const interState = isInterState(input.supplierState, input.placeOfSupply)
  const bases = input.lines.map((l) => mulDivRound(l.qty, l.rate, 1000))
  const lineDisc = input.lines.map((l, i) => discountOn(bases[i], l.discount))
  const afterLine = bases.map((b, i) => b - lineDisc[i])
  const invDisc = discountOn(afterLine.reduce((a, b) => a + b, 0), input.discount)
  const invShare = allocate(invDisc, afterLine)

  const lines: LineResult[] = input.lines.map((l, i) => {
    const net = afterLine[i] - invShare[i]
    const rate = input.chargesTax ? l.taxRate : 0
    let taxable: Paise
    let cgst = 0
    let sgst = 0
    let igst = 0
    if (input.taxMode === 'inclusive') {
      taxable = Number(divRound(BigInt(net) * 10000n, BigInt(10000 + rate)))
      const tax = net - taxable
      if (interState) igst = tax
      else {
        cgst = Number(divRound(BigInt(tax), 2n))
        sgst = tax - cgst
      }
    } else {
      taxable = net
      if (interState) igst = mulDivRound(taxable, rate, 10000)
      else {
        // CGST and SGST are each levied at half the rate on the same taxable value.
        cgst = mulDivRound(taxable, rate, 20000)
        sgst = cgst
      }
    }
    const tax = cgst + sgst + igst
    return { base: bases[i], discount: lineDisc[i] + invShare[i], taxable, cgst, sgst, igst, tax, total: taxable + tax }
  })

  const sum = (k: keyof LineResult) => lines.reduce((a, l) => a + l[k], 0)
  const taxable = sum('taxable')
  const tax = sum('tax')
  const raw = taxable + tax
  const total = input.roundOff ? Number(divRound(BigInt(raw), 100n)) * 100 : raw

  const slabMap = new Map<number, TaxSlab>()
  input.lines.forEach((l, i) => {
    const rate = input.chargesTax ? l.taxRate : 0
    const s = slabMap.get(rate) ?? { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0 }
    s.taxable += lines[i].taxable
    s.cgst += lines[i].cgst
    s.sgst += lines[i].sgst
    s.igst += lines[i].igst
    slabMap.set(rate, s)
  })

  return {
    lines,
    interState,
    subtotal: sum('base'),
    discount: sum('discount'),
    taxable,
    cgst: sum('cgst'),
    sgst: sum('sgst'),
    igst: sum('igst'),
    tax,
    roundOff: total - raw,
    total,
    advanceAdjusted: input.advanceAdjusted,
    retention: input.retention,
    payable: total - input.advanceAdjusted - input.retention,
    slabs: [...slabMap.values()].sort((a, b) => a.rate - b.rate),
  }
}

// Payments recorded against an issued invoice. Balance never goes below zero in display;
// overpayment is rejected at entry (see validatePayment).
export function balance(payable: Paise, paid: Paise): Paise {
  return Math.max(0, payable - paid)
}
