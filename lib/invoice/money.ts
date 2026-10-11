// Money is integer paise everywhere (₹1 = 100). Products go through BigInt and round
// half-up, so totals never pick up floating-point drift. Rates are basis points (18% = 1800).
export type Paise = number

export function divRound(n: bigint, d: bigint): bigint {
  if (d <= 0n) throw new Error('divisor must be positive')
  if (n < 0n) return -divRound(-n, d)
  return (n * 2n + d) / (2n * d)
}

// round(a * b / d) with exact integer math.
export function mulDivRound(a: number, b: number, d: number): number {
  return Number(divRound(BigInt(a) * BigInt(b), BigInt(d)))
}

const MONEY = /^\d{1,13}(\.\d{0,2})?$/

// "12,500.5" -> 1250050. Null for anything that isn't a non-negative amount.
export function parseRupees(input: string): Paise | null {
  const s = input.replace(/[,\s₹]/g, '')
  if (!MONEY.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2))
}

// "18" or "2.5" percent -> basis points. Null if not 0..100 with ≤2 decimals.
export function parsePercent(input: string): number | null {
  const s = input.trim()
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  const bps = Number(whole) * 100 + Number((frac + '00').slice(0, 2))
  return bps <= 10000 ? bps : null
}

// Quantity with up to 3 decimals -> thousandths (1.5 -> 1500).
export function parseQty(input: string): number | null {
  const s = input.trim()
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  return Number(whole) * 1000 + Number((frac + '000').slice(0, 3))
}

const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// 1234567 paise -> "12,345.67" (Indian grouping). withSymbol adds "₹ ".
export function formatINR(p: Paise, withSymbol = true): string {
  const sign = p < 0 ? '-' : ''
  const abs = Math.abs(p)
  const text = inr.format(Math.trunc(abs / 100) + (abs % 100) / 100)
  return `${sign}${withSymbol ? '₹ ' : ''}${text}`
}

export const rupeesString = (p: Paise) => (p / 100).toFixed(2) // for form inputs only
export const percentString = (bps: number) => String(bps / 100)
export const qtyString = (milli: number) => String(milli / 1000)
