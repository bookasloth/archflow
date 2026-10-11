// Amount in words, Indian system (thousand, lakh, crore): 12345678 paise ->
// "Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty-Six and Seventy-Eight Paise Only".
import type { Paise } from '@/lib/invoice/money'

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function below100(n: number): string {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')
}

function below1000(n: number): string {
  const h = Math.floor(n / 100)
  const r = n % 100
  return [h ? `${ONES[h]} Hundred` : '', r ? below100(r) : ''].filter(Boolean).join(' ')
}

export function integerInWords(n: number): string {
  if (n === 0) return 'Zero'
  const parts: string[] = []
  const crore = Math.floor(n / 10_000_000)
  n %= 10_000_000
  const lakh = Math.floor(n / 100_000)
  n %= 100_000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  if (crore) parts.push(`${integerInWords(crore)} Crore`) // recursion handles ≥100 crore
  if (lakh) parts.push(`${below100(lakh)} Lakh`)
  if (thousand) parts.push(`${below100(thousand)} Thousand`)
  if (n) parts.push(below1000(n))
  return parts.join(' ')
}

export function amountInWords(p: Paise): string {
  const rupees = Math.trunc(Math.abs(p) / 100)
  const paise = Math.abs(p) % 100
  return `Rupees ${integerInWords(rupees)}${paise ? ` and ${below100(paise)} Paise` : ''} Only`
}
