// Database-level invoicing tests against a LOCAL Supabase stack (real Postgres, RLS,
// triggers, functions). Skipped unless LOCAL_SUPABASE_URL/ANON_KEY/SERVICE_KEY are set:
//   supabase start   (in this repo; config.toml uses ports 573xx)
//   eval "$(supabase status -o env | sed 's/^/export LOCAL_/')"  → see docs/invoicing.md
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { duplicateFields } from '@/lib/invoice/draft'

const URL_ = process.env.LOCAL_SUPABASE_URL
const ANON = process.env.LOCAL_SUPABASE_ANON_KEY
const SERVICE = process.env.LOCAL_SUPABASE_SERVICE_KEY
const enabled = !!(URL_ && ANON && SERVICE && /127\.0\.0\.1|localhost/.test(URL_))

type DB = SupabaseClient<Database>
const run = Math.random().toString(36).slice(2, 7).toUpperCase()
const PREFIX = `T${run}`.slice(0, 12)
let svc: DB, admin: DB, staff: DB, anon: DB
let clientId = ''

async function userClient(email: string, role: 'admin' | 'staff'): Promise<DB> {
  const password = `pw-${run}-${role}-test`
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  if (role === 'admin') {
    const { error: pe } = await svc.from('profiles').update({ role: 'admin' }).eq('id', data.user.id)
    if (pe) throw pe
  }
  const c = createClient<Database>(URL_!, ANON!, { auth: { persistSession: false } })
  const { error: e2 } = await c.auth.signInWithPassword({ email, password })
  if (e2) throw e2
  return c
}

async function draft(db: DB, amountRupees = 10000) {
  const { data: inv, error } = await db.from('invoices').insert({
    client_id: clientId, doc_type: 'tax_invoice', invoice_date: '2026-10-11', due_date: '2026-10-26',
    place_of_supply: 'Maharashtra', payable: amountRupees * 118, total: amountRupees * 118,
  }).select('id').single()
  if (error) throw error
  const { error: le } = await db.rpc('replace_invoice_lines', {
    p_invoice: inv.id,
    p_lines: [{ position: 0, description: 'Design fee', category: 'Concept design', qty: 1000, unit: 'lot', rate: amountRupees * 100,
      discount_kind: null, discount_value: 0, tax_rate: 1800, taxable: amountRupees * 100, tax: amountRupees * 18, total: amountRupees * 118 }],
  })
  if (le) throw le
  return inv.id
}

describe.skipIf(!enabled)('invoicing in the database (local Supabase)', () => {
  beforeAll(async () => {
    svc = createClient<Database>(URL_!, SERVICE!, { auth: { persistSession: false } })
    anon = createClient<Database>(URL_!, ANON!, { auth: { persistSession: false } })
    admin = await userClient(`admin-${run}@example.test`, 'admin')
    staff = await userClient(`staff-${run}@example.test`, 'staff')
    const { error } = await admin.from('business_profile').upsert({
      id: true, firm_name: 'Test Studio', state: 'Maharashtra', gst_registered: true, gstin: '27ABCDE1234F1Z5',
      invoice_prefix: PREFIX, number_by_fy: true,
    })
    if (error) throw error
    const { data, error: ce } = await admin.from('clients').insert({ name: `Client ${run}`, state: 'Maharashtra' }).select('id').single()
    if (ce) throw ce
    clientId = data.id
  }, 60_000)

  it('12. data isolation: staff and anonymous users cannot read or write billing data', async () => {
    const draftId = await draft(admin)
    for (const db of [staff, anon]) {
      expect((await db.from('invoices').select('id').eq('id', draftId)).data ?? []).toHaveLength(0)
      expect((await db.from('clients').select('id')).data ?? []).toHaveLength(0)
      expect((await db.from('business_profile').select('firm_name')).data ?? []).toHaveLength(0)
      const ins = await db.from('clients').insert({ name: 'sneaky' })
      expect(ins.error).not.toBeNull()
    }
    const issue = await staff.rpc('issue_invoice', { p_id: draftId })
    expect(issue.error?.message).toMatch(/only admins/)
    const pay = await staff.rpc('record_payment', { p_invoice: draftId, p_paid_on: '2026-10-12', p_amount: 100, p_method: 'upi' })
    expect(pay.error).not.toBeNull()
  })

  it('8. numbering: concurrent issues get unique, gap-free sequential numbers', async () => {
    const ids = await Promise.all(Array.from({ length: 6 }, () => draft(admin)))
    const results = await Promise.all(ids.map((id) => admin.rpc('issue_invoice', { p_id: id })))
    const numbers = results.map((r) => { expect(r.error).toBeNull(); return r.data as string })
    const seqs = numbers.map((n) => Number(n.split('/').pop())).sort((a, b) => a - b)
    expect(new Set(numbers).size).toBe(6)
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6])
    expect(numbers[0]).toMatch(new RegExp(`^${PREFIX}/2026-27/\\d{4}$`))
    // issuing twice is refused
    expect((await admin.rpc('issue_invoice', { p_id: ids[0] })).error?.message).toMatch(/only drafts/)
  }, 60_000)

  it('14. drafts are editable; issued invoices are frozen (fields, lines, delete)', async () => {
    const id = await draft(admin)
    expect((await admin.from('invoices').update({ notes: 'edited' }).eq('id', id)).error).toBeNull()
    await admin.rpc('issue_invoice', { p_id: id })
    const upd = await admin.from('invoices').update({ notes: 'tamper', payable: 1 }).eq('id', id)
    expect(upd.error?.message).toMatch(/cannot be edited/)
    const lines = await admin.rpc('replace_invoice_lines', { p_invoice: id, p_lines: [] })
    expect(lines.error?.message).toMatch(/only drafts/)
    const del = await admin.from('invoices').delete().eq('id', id)
    expect(del.error?.message).toMatch(/cannot be deleted/)
    const { data } = await admin.from('invoices').select('notes, number, seller, buyer').eq('id', id).single()
    expect(data?.notes).toBe('edited')
    expect((data?.seller as { firm_name: string }).firm_name).toBe('Test Studio') // snapshot frozen at issue
    expect((data?.buyer as { name: string }).name).toBe(`Client ${run}`)
  })

  it('6/13. payments: partial then full, no overpayment, void keeps history', async () => {
    const id = await draft(admin, 10000) // payable ₹11,800
    expect((await admin.rpc('record_payment', { p_invoice: id, p_paid_on: '2026-10-12', p_amount: 100, p_method: 'upi' })).error?.message)
      .toMatch(/issued invoices/)
    await admin.rpc('issue_invoice', { p_id: id })
    const p1 = await admin.rpc('record_payment', { p_invoice: id, p_paid_on: '2026-10-12', p_amount: 500_000, p_method: 'upi', p_reference: 'UTR1' })
    expect(p1.error).toBeNull()
    const over = await admin.rpc('record_payment', { p_invoice: id, p_paid_on: '2026-10-13', p_amount: 700_000, p_method: 'cash' })
    expect(over.error?.message).toMatch(/exceeds the balance/)
    const p2 = await admin.rpc('record_payment', { p_invoice: id, p_paid_on: '2026-10-13', p_amount: 680_000, p_method: 'bank_transfer' })
    expect(p2.error).toBeNull()
    const sumPaid = async () => ((await admin.from('invoice_payments').select('amount').eq('invoice_id', id).is('voided_at', null)).data ?? [])
      .reduce((a, x) => a + Number(x.amount), 0)
    expect(await sumPaid()).toBe(1_180_000)
    expect((await admin.rpc('void_payment', { p_payment: p1.data!, p_reason: 'bounced' })).error).toBeNull()
    expect(await sumPaid()).toBe(680_000)
    const { data: all } = await admin.from('invoice_payments').select('id, voided_at').eq('invoice_id', id)
    expect(all).toHaveLength(2) // voided, not deleted
    const { data: ev } = await admin.from('invoice_events').select('kind').eq('invoice_id', id)
    expect(ev?.map((e) => e.kind)).toEqual(expect.arrayContaining(['issued', 'payment_recorded', 'payment_voided']))
  })

  it('cancel keeps the number used; the next issue never reuses it', async () => {
    const a = await draft(admin)
    const n1 = (await admin.rpc('issue_invoice', { p_id: a })).data as string
    expect((await admin.rpc('cancel_invoice', { p_id: a, p_reason: 'wrong client' })).error).toBeNull()
    expect((await admin.from('invoices').update({ notes: 'x' }).eq('id', a)).error).not.toBeNull()
    const b = await draft(admin)
    const n2 = (await admin.rpc('issue_invoice', { p_id: b })).data as string
    expect(Number(n2.split('/').pop())).toBe(Number(n1.split('/').pop()) + 1)
  })

  it('9. duplicate creates an unnumbered draft that can be edited', async () => {
    const id = await draft(admin)
    await admin.rpc('issue_invoice', { p_id: id })
    const { data: src } = await admin.from('invoices').select('*').eq('id', id).single()
    const { data: copy, error } = await admin.from('invoices').insert(duplicateFields(src!, '2026-10-20', 15) as never).select('*').single()
    expect(error).toBeNull()
    expect(copy).toMatchObject({ status: 'draft', number: null, share_token: null, duplicated_from: id, invoice_date: '2026-10-20' })
  })

  it('client link: only the right token on an issued invoice reads anything', async () => {
    const id = await draft(admin)
    expect((await admin.from('invoices').select('share_token').eq('id', id).single()).data?.share_token).toBeNull() // drafts have no link
    await admin.rpc('issue_invoice', { p_id: id })
    const { data: inv } = await admin.from('invoices').select('share_token, number').eq('id', id).single()
    const shared = await anon.rpc('get_shared_invoice', { p_token: inv!.share_token! })
    expect((shared.data as { invoice: { number: string } }).invoice.number).toBe(inv!.number)
    expect((shared.data as { invoice: Record<string, unknown> }).invoice.share_token).toBeUndefined()
    const wrong = await anon.rpc('get_shared_invoice', { p_token: crypto.randomUUID() })
    expect(wrong.data).toBeNull()
  })
})
