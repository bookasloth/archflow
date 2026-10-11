'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { computeInvoice } from '@/lib/invoice/calc'
import { calcInput, type InvoiceRow, type LineRow } from '@/lib/invoice/model'
import { validateDraft, duplicateFields, validatePayment } from '@/lib/invoice/draft'
import { parsePercent, parseQty, parseRupees } from '@/lib/invoice/money'
import { PAYMENT_METHODS, todayIST, type DocType, type PaymentMethod } from '@/lib/invoice/rules'

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: Record<string, string> }

// Defense in depth: RLS is the real boundary (admin-only), this just fails fast and clearly.
async function adminClient() {
  const { user, role } = await getCurrentUserWithRole()
  if (!user || role !== 'admin') throw new Error('Only admins can manage invoices')
  return createClient()
}

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim()
  return v || null
}
// Postgres errors raised by our functions are written for people; others get a generic line.
const dbError = (e: { message?: string; code?: string } | null, fallback: string) =>
  e?.code === 'P0001' ? e.message ?? fallback : e?.code === '23503' ? 'This record is still used by an invoice' : fallback

function revalidateInvoices(id?: string) {
  revalidatePath('/invoices')
  if (id) revalidatePath(`/invoices/${id}`)
}

// ---- business profile ------------------------------------------------------------------
export async function saveBusinessProfile(fd: FormData): Promise<Result> {
  const supabase = await adminClient()
  const gst = fd.get('gst_registered') === 'on'
  const errors: Record<string, string> = {}
  const firm = str(fd, 'firm_name')
  if (!firm) errors.firm_name = 'Firm name is required'
  const gstin = str(fd, 'gstin')?.toUpperCase() ?? null
  if (gst && !gstin) errors.gstin = 'GSTIN is required when GST-registered'
  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) errors.gstin = 'GSTIN has 15 letters/digits'
  const pan = str(fd, 'pan')?.toUpperCase() ?? null
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) errors.pan = 'PAN looks like ABCDE1234F'
  const taxRate = parsePercent(String(fd.get('default_tax_rate') ?? '18'))
  if (taxRate === null) errors.default_tax_rate = 'Enter a rate between 0 and 100'
  const dueDays = Number(fd.get('default_due_days') ?? 15)
  if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 365) errors.default_due_days = '0–365 days'
  const prefix = str(fd, 'invoice_prefix') ?? 'INV'
  if (!/^[A-Za-z0-9-]{1,12}$/.test(prefix)) errors.invoice_prefix = 'Letters, digits or "-", up to 12'
  const pPrefix = str(fd, 'proforma_prefix') ?? 'PI'
  if (!/^[A-Za-z0-9-]{1,12}$/.test(pPrefix)) errors.proforma_prefix = 'Letters, digits or "-", up to 12'
  const accent = str(fd, 'accent_color') ?? '#FE5000'
  if (!/^#[0-9A-Fa-f]{6}$/.test(accent)) errors.accent_color = 'Use a hex colour like #FE5000'
  const logo = str(fd, 'logo_data')
  const signature = str(fd, 'signature_data')
  for (const [k, v] of [['logo_data', logo], ['signature_data', signature]] as const)
    if (v && (!/^data:image\/(png|jpeg);base64,/.test(v) || v.length >= 400000)) errors[k] = 'Image must be PNG/JPEG under ~300 KB'
  if (Object.keys(errors).length) return { ok: false, error: 'Please fix the highlighted fields', fieldErrors: errors }

  const { error } = await supabase.from('business_profile').upsert({
    id: true, firm_name: firm!, principal_name: str(fd, 'principal_name'),
    address: str(fd, 'address'), city: str(fd, 'city'), state: str(fd, 'state'), pin: str(fd, 'pin'),
    country: str(fd, 'country') ?? 'India', phone: str(fd, 'phone'), email: str(fd, 'email'), website: str(fd, 'website'),
    gst_registered: gst, gstin, pan, registration: str(fd, 'registration'),
    bank_details: str(fd, 'bank_details'), upi_id: str(fd, 'upi_id'),
    logo_data: logo, signature_data: signature,
    default_tax_rate: taxRate!, default_tax_mode: fd.get('default_tax_mode') === 'inclusive' ? 'inclusive' : 'exclusive',
    default_due_days: dueDays, default_terms: str(fd, 'default_terms'), default_notes: str(fd, 'default_notes'),
    invoice_prefix: prefix, proforma_prefix: pPrefix, number_by_fy: fd.get('number_by_fy') === 'on',
    template: (['minimal', 'editorial', 'modern'].includes(String(fd.get('template'))) ? String(fd.get('template')) : 'minimal'),
    accent_color: accent, footer_note: str(fd, 'footer_note'), updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: dbError(error, 'Could not save the profile') }
  revalidatePath('/invoices', 'layout')
  return { ok: true }
}

// ---- clients ---------------------------------------------------------------------------
export async function saveClient(fd: FormData): Promise<Result<{ id: string }>> {
  const supabase = await adminClient()
  const id = str(fd, 'id')
  const name = str(fd, 'name')
  const gstin = str(fd, 'gstin')?.toUpperCase() ?? null
  const email = str(fd, 'email')
  const errors: Record<string, string> = {}
  if (!name) errors.name = 'Client name is required'
  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) errors.gstin = 'GSTIN has 15 letters/digits'
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email'
  if (Object.keys(errors).length) return { ok: false, error: 'Please fix the highlighted fields', fieldErrors: errors }
  const row = {
    name: name!, contact_person: str(fd, 'contact_person'), billing_address: str(fd, 'billing_address'),
    site_address: str(fd, 'site_address'), state: str(fd, 'state'), pin: str(fd, 'pin'), email,
    phone: str(fd, 'phone'), gstin, notes: str(fd, 'notes'), updated_at: new Date().toISOString(),
  }
  const res = id
    ? await supabase.from('clients').update(row).eq('id', id).select('id').single()
    : await supabase.from('clients').insert(row).select('id').single()
  if (res.error || !res.data) return { ok: false, error: dbError(res.error, 'Could not save the client') }
  revalidatePath('/invoices', 'layout')
  return { ok: true, id: res.data.id }
}

export async function deleteClient(id: string): Promise<Result> {
  const supabase = await adminClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) return { ok: false, error: error.code === '23503' ? 'This client has invoices — it can’t be deleted' : 'Could not delete the client' }
  revalidatePath('/invoices', 'layout')
  return { ok: true }
}

// ---- project billing (projects themselves stay Archflow projects) ---------------------
export async function saveProjectBilling(fd: FormData): Promise<Result<{ projectId: string }>> {
  const supabase = await adminClient()
  let projectId = str(fd, 'project_id')
  const errors: Record<string, string> = {}
  const money = (k: string) => {
    const raw = str(fd, k)
    if (!raw) return null
    const v = parseRupees(raw)
    if (v === null) errors[k] = 'Enter an amount like 250000 or 2,50,000.00'
    return v
  }
  const contract = money('contract_value')
  const fee = money('agreed_fee')
  const start = str(fd, 'start_date')
  const end = str(fd, 'end_date')
  if (start && end && end < start) errors.end_date = 'Completion is before start'
  if (!projectId && !str(fd, 'name')) errors.name = 'Project name is required'
  if (Object.keys(errors).length) return { ok: false, error: 'Please fix the highlighted fields', fieldErrors: errors }

  if (!projectId) {
    const { user } = await getCurrentUserWithRole()
    const { data, error } = await supabase.from('projects')
      .insert({ name: str(fd, 'name')!, code: str(fd, 'code'), created_by: user!.id }).select('id').single()
    if (error || !data) return { ok: false, error: 'Could not create the project' }
    projectId = data.id
  }
  const { error } = await supabase.from('project_billing').upsert({
    project_id: projectId, client_id: str(fd, 'client_id'), reference: str(fd, 'reference'),
    project_type: str(fd, 'project_type'), location: str(fd, 'location'), site_state: str(fd, 'site_state'),
    description: str(fd, 'description'), contract_value: contract, agreed_fee: fee,
    billing_method: str(fd, 'billing_method'), start_date: start, end_date: end, notes: str(fd, 'notes'),
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: dbError(error, 'Could not save project billing') }
  revalidatePath('/invoices', 'layout')
  revalidatePath('/', 'layout') // project list in the sidebar
  return { ok: true, projectId: projectId! }
}

// ---- invoices --------------------------------------------------------------------------
export type DraftPayload = {
  id: string | null
  docType: DocType
  clientId: string | null
  projectId: string | null
  invoiceDate: string
  dueDate: string | null
  poReference: string
  placeOfSupply: string
  taxMode: 'exclusive' | 'inclusive'
  discountKind: 'percent' | 'fixed' | ''
  discountValue: string // percent or rupees, as typed
  advance: string
  retention: string
  roundOff: boolean
  notes: string
  terms: string
  paymentInstructions: string
  template: 'minimal' | 'editorial' | 'modern'
  lines: { description: string; category: string; qty: string; unit: string; rate: string; discountKind: 'percent' | 'fixed' | ''; discountValue: string; taxRate: string }[]
}

export async function saveInvoiceDraft(p: DraftPayload): Promise<Result<{ id: string }>> {
  const supabase = await adminClient()
  const { data: bp } = await supabase.from('business_profile').select('gst_registered, state').maybeSingle()
  if (!bp) return { ok: false, error: 'Set up your business profile first (Invoices → Settings)' }

  const fe: Record<string, string> = {}
  const money = (raw: string, key: string) => {
    if (!raw.trim()) return 0
    const v = parseRupees(raw)
    if (v === null) fe[key] = 'Enter a valid amount (no negatives)'
    return v ?? 0
  }
  const disc = (kind: string, raw: string, key: string) => {
    if (!kind || !raw.trim()) return { kind: null, value: 0 }
    const v = kind === 'percent' ? parsePercent(raw) : parseRupees(raw)
    if (v === null) fe[key] = kind === 'percent' ? 'Discount must be 0–100%' : 'Enter a valid amount'
    return { kind: kind as 'percent' | 'fixed', value: v ?? 0 }
  }
  const lines = p.lines.map((l, i) => {
    const qty = parseQty(l.qty)
    if (qty === null || qty === 0) fe[`line${i}.qty`] = 'Quantity must be more than 0'
    const rate = parseRupees(l.rate)
    if (rate === null) fe[`line${i}.rate`] = 'Enter a valid rate'
    const tax = parsePercent(l.taxRate || '0')
    if (tax === null) fe[`line${i}.taxRate`] = 'GST rate must be 0–100%'
    const d = disc(l.discountKind, l.discountValue, `line${i}.discount`)
    return {
      position: i, description: l.description.trim(), category: l.category.trim() || null, unit: l.unit.trim() || null,
      qty: qty ?? 0, rate: rate ?? 0, discount_kind: d.kind, discount_value: d.value, tax_rate: tax ?? 0,
    }
  })
  const invDisc = disc(p.discountKind, p.discountValue, 'discount')
  const row = {
    doc_type: p.docType, client_id: p.clientId!, project_id: p.projectId || null,
    invoice_date: p.invoiceDate, due_date: p.dueDate || null, po_reference: p.poReference.trim() || null,
    place_of_supply: p.placeOfSupply.trim() || null, tax_mode: p.taxMode,
    discount_kind: invDisc.kind, discount_value: invDisc.value,
    advance_adjusted: money(p.advance, 'advance'), retention: money(p.retention, 'retention'),
    round_off: p.roundOff, notes: p.notes.trim() || null, terms: p.terms.trim() || null,
    payment_instructions: p.paymentInstructions.trim() || null, template: p.template,
  }
  if (Object.keys(fe).length) return { ok: false, error: 'Please fix the highlighted fields', fieldErrors: fe }

  const input = calcInput(row as unknown as InvoiceRow, lines as unknown as LineRow[], bp)
  const errors = validateDraft({ ...input, clientId: p.clientId, invoiceDate: p.invoiceDate, dueDate: p.dueDate, descriptions: lines.map((l) => l.description) })
  if (Object.keys(errors).length) return { ok: false, error: 'Please fix the highlighted fields', fieldErrors: errors }

  // Stored totals come from the same engine the PDF uses.
  const t = computeInvoice(input)
  const totals = {
    subtotal: t.subtotal, discount_total: t.discount, taxable_total: t.taxable, cgst_total: t.cgst,
    sgst_total: t.sgst, igst_total: t.igst, tax_total: t.tax, round_off_amount: t.roundOff, total: t.total, payable: t.payable,
  }
  let id = p.id
  if (id) {
    const { error } = await supabase.from('invoices').update({ ...row, ...totals }).eq('id', id).eq('status', 'draft')
    if (error) return { ok: false, error: dbError(error, 'Could not save the draft') }
  } else {
    const { data, error } = await supabase.from('invoices').insert({ ...row, ...totals }).select('id').single()
    if (error || !data) return { ok: false, error: dbError(error, 'Could not create the invoice') }
    id = data.id
  }
  const { error: lineErr } = await supabase.rpc('replace_invoice_lines', {
    p_invoice: id!,
    p_lines: lines.map((l, i) => ({ ...l, taxable: t.lines[i].taxable, tax: t.lines[i].tax, total: t.lines[i].total })),
  })
  if (lineErr) return { ok: false, error: dbError(lineErr, 'Could not save the line items') }
  await supabase.from('invoice_events').insert({ invoice_id: id!, kind: p.id ? 'edited' : 'created' })
  revalidateInvoices(id!)
  return { ok: true, id: id! }
}

export async function issueInvoice(id: string): Promise<Result<{ number: string }>> {
  const supabase = await adminClient()
  const { data, error } = await supabase.rpc('issue_invoice', { p_id: id })
  if (error || !data) return { ok: false, error: dbError(error, 'Could not issue the invoice') }
  revalidateInvoices(id)
  return { ok: true, number: data }
}

export async function deleteDraft(id: string): Promise<Result> {
  const supabase = await adminClient()
  const { error, count } = await supabase.from('invoices').delete({ count: 'exact' }).eq('id', id).eq('status', 'draft')
  if (error || !count) return { ok: false, error: dbError(error, 'Only drafts can be deleted') }
  revalidateInvoices()
  return { ok: true }
}

export async function duplicateInvoice(id: string): Promise<Result<{ id: string }>> {
  const supabase = await adminClient()
  const [{ data: src }, { data: lines }, { data: bp }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase.from('invoice_lines').select('*').eq('invoice_id', id).order('position'),
    supabase.from('business_profile').select('default_due_days').maybeSingle(),
  ])
  if (!src) return { ok: false, error: 'Invoice not found' }
  const fields = duplicateFields(src, todayIST(), bp?.default_due_days ?? 15)
  const { data, error } = await supabase.from('invoices').insert(fields as never).select('id').single()
  if (error || !data) return { ok: false, error: dbError(error, 'Could not duplicate') }
  const { error: lineErr } = await supabase.rpc('replace_invoice_lines', {
    p_invoice: data.id,
    p_lines: (lines ?? []).map(({ id: _id, invoice_id: _inv, ...l }) => { void _id; void _inv; return l }),
  })
  if (lineErr) return { ok: false, error: dbError(lineErr, 'Could not copy the line items') }
  await supabase.from('invoice_events').insert([
    { invoice_id: data.id, kind: 'created', detail: { duplicated_from: src.number ?? 'draft' } },
    { invoice_id: id, kind: 'duplicated', detail: { to: data.id } },
  ])
  revalidateInvoices()
  return { ok: true, id: data.id }
}

export async function cancelInvoice(id: string, reason: string): Promise<Result> {
  const supabase = await adminClient()
  const { error } = await supabase.rpc('cancel_invoice', { p_id: id, p_reason: reason })
  if (error) return { ok: false, error: dbError(error, 'Could not cancel the invoice') }
  revalidateInvoices(id)
  return { ok: true }
}

export async function recordPayment(fd: FormData): Promise<Result> {
  const supabase = await adminClient()
  const id = String(fd.get('invoice_id'))
  const amount = parseRupees(String(fd.get('amount') ?? ''))
  const balance = Number(fd.get('balance') ?? 0)
  const method = String(fd.get('method')) as PaymentMethod
  const paidOn = str(fd, 'paid_on')
  const amountErr = validatePayment(amount, balance)
  const fe: Record<string, string> = {}
  if (amountErr) fe.amount = amountErr
  if (!paidOn) fe.paid_on = 'Payment date is required'
  if (!PAYMENT_METHODS.includes(method)) fe.method = 'Choose a method'
  if (Object.keys(fe).length) return { ok: false, error: 'Please fix the highlighted fields', fieldErrors: fe }
  const { error } = await supabase.rpc('record_payment', {
    p_invoice: id, p_paid_on: paidOn!, p_amount: amount!, p_method: method,
    p_reference: str(fd, 'reference') ?? undefined, p_notes: str(fd, 'notes') ?? undefined,
  })
  if (error) return { ok: false, error: dbError(error, 'Could not record the payment') }
  revalidateInvoices(id)
  return { ok: true }
}

export async function voidPayment(paymentId: string, invoiceId: string, reason: string): Promise<Result> {
  const supabase = await adminClient()
  const { error } = await supabase.rpc('void_payment', { p_payment: paymentId, p_reason: reason })
  if (error) return { ok: false, error: dbError(error, 'Could not void the payment') }
  revalidateInvoices(invoiceId)
  return { ok: true }
}
