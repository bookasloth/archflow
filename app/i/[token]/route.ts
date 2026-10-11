import { createClient } from '@/lib/supabase/server'
import { loadSharedDoc, isUuid } from '@/lib/invoice/data'
import { renderInvoicePdf, pdfFileName } from '@/lib/invoice/pdf/InvoicePdf'

export const runtime = 'nodejs'

// Client-facing link: the PDF of one issued invoice, found only by its unguessable token
// (get_shared_invoice). No login, no listing, nothing else readable.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!isUuid(token)) return new Response('Invoice not found', { status: 404 })
  const supabase = await createClient()
  const doc = await loadSharedDoc(supabase, token)
  if (!doc) return new Response('Invoice not found', { status: 404 })
  try {
    const pdf = await renderInvoicePdf(doc)
    const disposition = new URL(req.url).searchParams.get('download') ? 'attachment' : 'inline'
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${pdfFileName(doc)}"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (e) {
    console.error('shared invoice pdf failed', e)
    return new Response('Could not generate the PDF. Please try again.', { status: 500 })
  }
}
