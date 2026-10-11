import type { InvoiceDoc } from '@/lib/invoice/model'

// "INV_2026-27_0001-Mehta_Residences_LLP.pdf" — safe on every OS and in share sheets.
export const pdfFileName = (doc: Pick<InvoiceDoc, 'number' | 'buyer'>) =>
  `${(doc.number ?? 'DRAFT').replace(/[^A-Za-z0-9-]+/g, '_')}-${doc.buyer.name.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40)}.pdf`
