import { createClient } from '@/lib/supabase/server'
import { loadInvoice, isUuid } from '@/lib/invoice/data'
import { renderInvoicePdf, pdfFileName } from '@/lib/invoice/pdf/InvoicePdf'
import type { Template } from '@/lib/invoice/model'

export const runtime = 'nodejs'

// Admin PDF (RLS: only admins can read invoices). ?template= previews another template
// without changing the stored invoice; ?download=1 saves instead of opening inline.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return new Response('Not found', { status: 404 })
  const supabase = await createClient()
  const r = await loadInvoice(supabase, id)
  if (!r) return new Response('Not found', { status: 404 })
  if (!r.doc) return new Response(r.missing === 'profile' ? 'Set up the business profile first' : 'Client not found', { status: 409 })

  const url = new URL(req.url)
  const t = url.searchParams.get('template')
  const doc = t && ['minimal', 'editorial', 'modern'].includes(t) ? { ...r.doc, template: t as Template } : r.doc
  try {
    const pdf = await renderInvoicePdf(doc)
    const disposition = url.searchParams.get('download') ? 'attachment' : 'inline'
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${pdfFileName(doc)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    console.error('invoice pdf failed', id, e)
    return new Response('Could not generate the PDF. Please try again.', { status: 500 })
  }
}
