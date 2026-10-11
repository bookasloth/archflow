// Stored rows <-> editor form values (strings as typed). Server-only helpers for the pages.
import type { DraftPayload } from '@/app/(app)/invoice-actions'
import { percentString, qtyString, rupeesString } from '@/lib/invoice/money'
import type { DocType } from '@/lib/invoice/rules'
import type { createClient } from '@/lib/supabase/server'

type DB = Awaited<ReturnType<typeof createClient>>
const money = (p: number) => (p ? rupeesString(p) : '')
const disc = (kind: 'percent' | 'fixed' | null, v: number) => (kind === 'percent' ? percentString(v) : kind === 'fixed' ? rupeesString(v) : '')

export async function editorData(supabase: DB) {
  const [{ data: profile }, { data: clients }, { data: projects }, { data: billing }] = await Promise.all([
    supabase.from('business_profile').select('*').maybeSingle(),
    supabase.from('clients').select('*').order('name'),
    supabase.from('projects').select('id, name, code').order('name'),
    supabase.from('project_billing').select('project_id, client_id, site_state'),
  ])
  const b = new Map((billing ?? []).map((x) => [x.project_id, x]))
  return {
    profile,
    clients: clients ?? [],
    projects: (projects ?? []).map((p) => ({ ...p, client_id: b.get(p.id)?.client_id ?? null, site_state: b.get(p.id)?.site_state ?? null })),
  }
}

export function newPayload(
  profile: { gst_registered: boolean; default_tax_rate: number; default_tax_mode: 'exclusive' | 'inclusive'; default_due_days: number; default_terms: string | null; default_notes: string | null; template: string },
  today: string,
  pre: { clientId?: string | null; projectId?: string | null; placeOfSupply?: string | null },
): DraftPayload {
  const due = new Date(today + 'T00:00:00Z')
  due.setUTCDate(due.getUTCDate() + profile.default_due_days)
  return {
    id: null,
    docType: (profile.gst_registered ? 'tax_invoice' : 'invoice') as DocType,
    clientId: pre.clientId ?? null,
    projectId: pre.projectId ?? null,
    invoiceDate: today,
    dueDate: due.toISOString().slice(0, 10),
    poReference: '',
    placeOfSupply: pre.placeOfSupply ?? '',
    taxMode: profile.default_tax_mode,
    discountKind: '', discountValue: '', advance: '', retention: '',
    roundOff: true,
    notes: profile.default_notes ?? '',
    terms: profile.default_terms ?? '',
    paymentInstructions: '',
    template: (['minimal', 'editorial', 'modern'].includes(profile.template) ? profile.template : 'minimal') as DraftPayload['template'],
    lines: [{ description: '', category: '', qty: '1', unit: '', rate: '', discountKind: '', discountValue: '', taxRate: percentString(profile.default_tax_rate) }],
  }
}

export function payloadFromRows(
  inv: {
    id: string; doc_type: DocType; client_id: string; project_id: string | null; invoice_date: string; due_date: string | null
    po_reference: string | null; place_of_supply: string | null; tax_mode: 'exclusive' | 'inclusive'
    discount_kind: 'percent' | 'fixed' | null; discount_value: number; advance_adjusted: number; retention: number; round_off: boolean
    notes: string | null; terms: string | null; payment_instructions: string | null; template: string
  },
  lines: { description: string; category: string | null; qty: number; unit: string | null; rate: number; discount_kind: 'percent' | 'fixed' | null; discount_value: number; tax_rate: number }[],
): DraftPayload {
  return {
    id: inv.id, docType: inv.doc_type, clientId: inv.client_id, projectId: inv.project_id,
    invoiceDate: inv.invoice_date, dueDate: inv.due_date, poReference: inv.po_reference ?? '',
    placeOfSupply: inv.place_of_supply ?? '', taxMode: inv.tax_mode,
    discountKind: inv.discount_kind ?? '', discountValue: disc(inv.discount_kind, Number(inv.discount_value)),
    advance: money(Number(inv.advance_adjusted)), retention: money(Number(inv.retention)), roundOff: inv.round_off,
    notes: inv.notes ?? '', terms: inv.terms ?? '', paymentInstructions: inv.payment_instructions ?? '',
    template: (['minimal', 'editorial', 'modern'].includes(inv.template) ? inv.template : 'minimal') as DraftPayload['template'],
    lines: lines.map((l) => ({
      description: l.description, category: l.category ?? '', qty: qtyString(l.qty), unit: l.unit ?? '',
      rate: rupeesString(Number(l.rate)), discountKind: l.discount_kind ?? '', discountValue: disc(l.discount_kind, Number(l.discount_value)),
      taxRate: percentString(l.tax_rate),
    })),
  }
}
