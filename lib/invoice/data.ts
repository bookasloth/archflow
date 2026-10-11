// Server-only loaders that turn rows into an InvoiceDoc. RLS decides what the caller may
// read; the share path goes through get_shared_invoice(token) instead.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { buildDoc, type BuyerRow, type InvoiceDoc, type InvoiceRow, type LineRow, type ProjectRow, type SellerRow } from '@/lib/invoice/model'

type DB = SupabaseClient<Database>

export async function loadInvoice(supabase: DB, id: string) {
  const [{ data: inv }, { data: lines }, { data: payments }, { data: events }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).maybeSingle(),
    supabase.from('invoice_lines').select('*').eq('invoice_id', id).order('position'),
    supabase.from('invoice_payments').select('*').eq('invoice_id', id).order('paid_on'),
    supabase.from('invoice_events').select('id, kind, detail, at, actor:actor(full_name)').eq('invoice_id', id).order('at'),
  ])
  if (!inv) return null

  let seller = inv.seller as unknown as SellerRow | null
  let buyer = inv.buyer as unknown as BuyerRow | null
  let project = inv.project_snapshot as unknown as ProjectRow | null
  if (inv.status === 'draft') {
    // drafts show live details; issue_invoice() freezes them
    const [{ data: bp }, { data: client }, { data: proj }] = await Promise.all([
      supabase.from('business_profile').select('*').maybeSingle(),
      supabase.from('clients').select('*').eq('id', inv.client_id).maybeSingle(),
      inv.project_id
        ? supabase.from('projects').select('name, code, project_billing(reference, project_type, location)').eq('id', inv.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    seller = bp as unknown as SellerRow | null
    buyer = client as unknown as BuyerRow | null
    const p = proj as unknown as { name: string; code: string | null; project_billing: Omit<ProjectRow, 'name' | 'code'> | null } | null
    project = p ? { name: p.name, code: p.code, reference: null, project_type: null, location: null, ...(p.project_billing ?? {}) } : null
  }
  if (!seller || !buyer) return { invoice: inv, doc: null, payments: payments ?? [], events: events ?? [], missing: !seller ? 'profile' : 'client' } as const

  const paid = (payments ?? []).filter((p) => !p.voided_at).reduce((a, p) => a + Number(p.amount), 0)
  const doc = buildDoc({
    invoice: inv as unknown as InvoiceRow,
    lines: (lines ?? []) as unknown as LineRow[],
    seller, buyer, project, paid,
  })
  return { invoice: inv, doc, payments: payments ?? [], events: events ?? [], missing: null } as const
}

export async function loadSharedDoc(supabase: DB, token: string): Promise<InvoiceDoc | null> {
  const { data } = await supabase.rpc('get_shared_invoice', { p_token: token })
  const r = data as unknown as { invoice: InvoiceRow & { seller: SellerRow; buyer: BuyerRow; project_snapshot: ProjectRow | null }; lines: LineRow[]; paid: number } | null
  if (!r?.invoice) return null
  return buildDoc({
    invoice: r.invoice, lines: r.lines, seller: r.invoice.seller, buyer: r.invoice.buyer,
    project: r.invoice.project_snapshot, paid: Number(r.paid),
  })
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
