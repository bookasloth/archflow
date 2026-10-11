'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveInvoiceDraft, type DraftPayload } from '@/app/(app)/invoice-actions'
import { computeInvoice } from '@/lib/invoice/calc'
import { formatINR, parsePercent, parseQty, parseRupees } from '@/lib/invoice/money'
import { amountInWords } from '@/lib/invoice/words'
import { DOC_TYPES, INDIAN_STATES, SERVICE_CATEGORIES, chargesTax, type DocType } from '@/lib/invoice/rules'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { Drawer } from '@/components/ui/Drawer'
import { Labeled, Textarea } from '@/components/invoice/fields'
import { ClientForm, type ClientRow } from '@/components/invoice/ClientForm'

export type EditorProfile = {
  gst_registered: boolean; state: string | null; default_tax_rate: number; default_tax_mode: 'exclusive' | 'inclusive'
  default_due_days: number; template: string
}
export type EditorProject = { id: string; name: string; code: string | null; client_id: string | null; site_state: string | null }

type Line = DraftPayload['lines'][number]
const GST_RATES = ['0', '5', '12', '18', '28']
const selectCls = 'h-8 rounded border border-subtle bg-surface px-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function blankLine(taxRate: string): Line {
  return { description: '', category: '', qty: '1', unit: '', rate: '', discountKind: '', discountValue: '', taxRate }
}

export function InvoiceEditor({
  initial, profile, clients, projects,
}: {
  initial: DraftPayload
  profile: EditorProfile
  clients: ClientRow[]
  projects: EditorProject[]
}) {
  const router = useRouter()
  const [p, setP] = useState<DraftPayload>(initial)
  const [dueTouched, setDueTouched] = useState(Boolean(initial.id))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [newClient, setNewClient] = useState(false)
  const [saving, startSave] = useTransition()

  const set = <K extends keyof DraftPayload>(k: K, v: DraftPayload[K]) => setP((s) => ({ ...s, [k]: v }))
  const setLine = (i: number, patch: Partial<Line>) =>
    setP((s) => ({ ...s, lines: s.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }))
  const moveLine = (i: number, d: -1 | 1) =>
    setP((s) => {
      const lines = [...s.lines]
      const j = i + d
      if (j < 0 || j >= lines.length) return s
      ;[lines[i], lines[j]] = [lines[j], lines[i]]
      return { ...s, lines }
    })

  const client = clients.find((c) => c.id === p.clientId) ?? null
  const taxed = chargesTax(p.docType, profile.gst_registered)

  // Live preview of the same engine the PDF and stored totals use. Unparseable input counts as 0
  // here; the server rejects it with a field error on save.
  const totals = useMemo(() => {
    const disc = (kind: string, raw: string) => {
      if (!kind || !raw) return null
      const v = kind === 'percent' ? parsePercent(raw) : parseRupees(raw)
      return v === null ? null : { kind: kind as 'percent' | 'fixed', value: v }
    }
    return computeInvoice({
      lines: p.lines.map((l) => ({
        qty: parseQty(l.qty) ?? 0, rate: parseRupees(l.rate) ?? 0,
        discount: disc(l.discountKind, l.discountValue), taxRate: parsePercent(l.taxRate || '0') ?? 0,
      })),
      taxMode: p.taxMode, chargesTax: taxed, supplierState: profile.state, placeOfSupply: p.placeOfSupply || null,
      discount: disc(p.discountKind, p.discountValue),
      advanceAdjusted: parseRupees(p.advance) ?? 0, retention: parseRupees(p.retention) ?? 0, roundOff: p.roundOff,
    })
  }, [p, taxed, profile.state])

  function chooseProject(id: string) {
    const proj = projects.find((x) => x.id === id)
    setP((s) => {
      const clientId = s.clientId || proj?.client_id || null
      const c = clients.find((x) => x.id === clientId)
      return { ...s, projectId: id || null, clientId, placeOfSupply: proj?.site_state || c?.state || s.placeOfSupply }
    })
  }
  function chooseClient(id: string) {
    const c = clients.find((x) => x.id === id)
    setP((s) => ({ ...s, clientId: id || null, placeOfSupply: s.placeOfSupply || c?.state || '' }))
  }

  function save() {
    setMessage(null)
    startSave(async () => {
      const r = await saveInvoiceDraft(p).catch(() => ({ ok: false as const, error: 'Could not reach the server — check your connection' }))
      if (r.ok) {
        router.push(`/invoices/${r.id}`)
        return
      }
      setErrors('fieldErrors' in r ? r.fieldErrors ?? {} : {})
      setMessage(r.error)
    })
  }

  const err = (k: string) => errors[k]
  const money = (n: number) => formatINR(n)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-7">
        {message && <p role="alert" className="rounded border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{message}</p>}

        <Section title="Bill to">
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Client *" error={err('client')}>
              <div className="flex gap-2">
                <select value={p.clientId ?? ''} onChange={(e) => chooseClient(e.target.value)} className={`${selectCls} min-w-0 flex-1`}>
                  <option value="">Choose a client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button type="button" size="sm" onClick={() => setNewClient(true)}>＋ New</Button>
              </div>
            </Labeled>
            <Labeled label="Project (optional)">
              <select value={p.projectId ?? ''} onChange={(e) => chooseProject(e.target.value)} className={selectCls}>
                <option value="">No project</option>
                {projects.map((x) => <option key={x.id} value={x.id}>{x.name}{x.code ? ` (${x.code})` : ''}</option>)}
              </select>
            </Labeled>
          </div>
          {client && (
            <p className="mt-2 text-xs text-ink-muted">
              {[client.billing_address, client.state, client.gstin && `GSTIN ${client.gstin}`, client.email].filter(Boolean).join(' · ')}
            </p>
          )}
        </Section>

        <Section title="Document">
          <div className="grid gap-3 sm:grid-cols-3">
            <Labeled label="Type">
              <select value={p.docType} onChange={(e) => set('docType', e.target.value as DocType)} className={selectCls}>
                {(Object.keys(DOC_TYPES) as DocType[]).map((d) => (
                  <option key={d} value={d} disabled={d === 'tax_invoice' && !profile.gst_registered}>
                    {DOC_TYPES[d].label}{d === 'tax_invoice' && !profile.gst_registered ? ' (needs GSTIN)' : ''}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Invoice date *" error={err('invoiceDate')}>
              <Input type="date" value={p.invoiceDate} onChange={(e) => {
                const d = e.target.value
                setP((s) => ({ ...s, invoiceDate: d, dueDate: dueTouched || !d ? s.dueDate : addDays(d, profile.default_due_days) }))
              }} />
            </Labeled>
            <Labeled label="Due date" error={err('dueDate')}>
              <Input type="date" value={p.dueDate ?? ''} onChange={(e) => { setDueTouched(true); set('dueDate', e.target.value || null) }} />
            </Labeled>
            <Labeled label="PO / work order ref.">
              <Input value={p.poReference} onChange={(e) => set('poReference', e.target.value)} />
            </Labeled>
            <Labeled label="Place of supply" hint={taxed ? (totals.interState ? 'Inter-state → IGST' : 'Same state → CGST + SGST') : undefined}>
              <select value={p.placeOfSupply} onChange={(e) => set('placeOfSupply', e.target.value)} className={selectCls}>
                <option value="">—</option>
                {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Labeled>
            <Labeled label="Pricing">
              <select value={p.taxMode} onChange={(e) => set('taxMode', e.target.value as 'exclusive' | 'inclusive')} className={selectCls} disabled={!taxed}>
                <option value="exclusive">Rates exclude GST</option>
                <option value="inclusive">Rates include GST</option>
              </select>
            </Labeled>
          </div>
        </Section>

        <Section title={`Services · ${p.lines.length}`}>
          {err('lines') && <p className="text-xs text-danger">{err('lines')}</p>}
          <datalist id="service-categories">{SERVICE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          <datalist id="gst-rates">{GST_RATES.map((r) => <option key={r} value={r} />)}</datalist>
          <ol className="space-y-3">
            {p.lines.map((l, i) => (
              <li key={i} className="rounded-lg border border-subtle bg-surface p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 w-5 shrink-0 text-xs text-ink-faint">{i + 1}</span>
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-6">
                    <Labeled label="Description *" error={err(`line${i}.description`)} className="col-span-2 sm:col-span-4">
                      <Textarea rows={2} className="min-h-0" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                    </Labeled>
                    <Labeled label="Category" className="col-span-2">
                      <Input list="service-categories" value={l.category} onChange={(e) => setLine(i, { category: e.target.value })} placeholder="Type or pick" />
                    </Labeled>
                    <Labeled label="Qty *" error={err(`line${i}.qty`)}>
                      <Input inputMode="decimal" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
                    </Labeled>
                    <Labeled label="Unit">
                      <Input value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} placeholder="lot, visit, sq.ft" />
                    </Labeled>
                    <Labeled label="Rate (₹) *" error={err(`line${i}.rate`)}>
                      <Input inputMode="decimal" value={l.rate} onChange={(e) => setLine(i, { rate: e.target.value })} />
                    </Labeled>
                    <Labeled label="Discount" error={err(`line${i}.discount`)}>
                      <div className="flex gap-1">
                        <select value={l.discountKind} onChange={(e) => setLine(i, { discountKind: e.target.value as Line['discountKind'] })} className={`${selectCls} w-14 px-1`}>
                          <option value="">—</option>
                          <option value="percent">%</option>
                          <option value="fixed">₹</option>
                        </select>
                        <Input inputMode="decimal" className="min-w-0 flex-1" value={l.discountValue} disabled={!l.discountKind} onChange={(e) => setLine(i, { discountValue: e.target.value })} />
                      </div>
                    </Labeled>
                    <Labeled label="GST %" error={err(`line${i}.taxRate`)}>
                      <Input list="gst-rates" inputMode="decimal" value={taxed ? l.taxRate : '0'} disabled={!taxed} onChange={(e) => setLine(i, { taxRate: e.target.value })} />
                    </Labeled>
                    <div className="flex flex-col justify-end gap-1 text-right">
                      <span className="text-[11px] font-medium text-ink-faint">{taxed ? 'Amount incl. GST' : 'Amount'}</span>
                      <span className="h-8 text-sm font-medium leading-8 text-ink">{money(totals.lines[i]?.total ?? 0)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveLine(i, -1)} className="rounded px-1.5 text-ink-muted hover:bg-surface-hover disabled:opacity-30">↑</button>
                    <button type="button" aria-label="Move down" disabled={i === p.lines.length - 1} onClick={() => moveLine(i, 1)} className="rounded px-1.5 text-ink-muted hover:bg-surface-hover disabled:opacity-30">↓</button>
                    <button type="button" aria-label="Remove line" onClick={() => setP((s) => ({ ...s, lines: s.lines.filter((_, j) => j !== i) }))} className="rounded px-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger">✕</button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <Button type="button" className="mt-3" onClick={() => setP((s) => ({ ...s, lines: [...s.lines, blankLine(String(profile.default_tax_rate / 100))] }))}>＋ Add service</Button>
        </Section>

        <Section title="Adjustments">
          <div className="grid gap-3 sm:grid-cols-3">
            <Labeled label="Invoice discount" error={err('discount')} hint="Applied before GST, spread across lines">
              <div className="flex gap-1">
                <select value={p.discountKind} onChange={(e) => set('discountKind', e.target.value as DraftPayload['discountKind'])} className={`${selectCls} w-14 px-1`}>
                  <option value="">—</option>
                  <option value="percent">%</option>
                  <option value="fixed">₹</option>
                </select>
                <Input inputMode="decimal" className="min-w-0 flex-1" value={p.discountValue} disabled={!p.discountKind} onChange={(e) => set('discountValue', e.target.value)} />
              </div>
            </Labeled>
            <Labeled label="Less: advance received (₹)" error={err('advance')} hint="Money received before this invoice — deducted once">
              <Input inputMode="decimal" value={p.advance} onChange={(e) => set('advance', e.target.value)} />
            </Labeled>
            <Labeled label="Less: retention (₹)" error={err('retention')}>
              <Input inputMode="decimal" value={p.retention} onChange={(e) => set('retention', e.target.value)} />
            </Labeled>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.roundOff} onChange={(e) => set('roundOff', e.target.checked)} />
            Round the total to the nearest rupee
          </label>
        </Section>

        <Section title="Notes & terms">
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Notes"><Textarea value={p.notes} onChange={(e) => set('notes', e.target.value)} /></Labeled>
            <Labeled label="Payment instructions"><Textarea value={p.paymentInstructions} onChange={(e) => set('paymentInstructions', e.target.value)} /></Labeled>
            <Labeled label="Terms & conditions" className="sm:col-span-2"><Textarea value={p.terms} onChange={(e) => set('terms', e.target.value)} /></Labeled>
          </div>
        </Section>

        <Section title="Template">
          <div className="flex flex-wrap gap-2">
            {([['minimal', 'Minimal Studio'], ['editorial', 'Editorial Architecture'], ['modern', 'Modern Professional']] as const).map(([k, label]) => (
              <label key={k} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${p.template === k ? 'border-primary bg-primary-soft text-primary' : 'border-subtle text-ink-muted hover:bg-surface-hover'}`}>
                <input type="radio" name="template" value={k} checked={p.template === k} onChange={() => set('template', k)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-faint">Preview every template on the next screen before issuing.</p>
        </Section>
      </div>

      {/* Totals — same engine as the PDF */}
      <aside className="h-fit space-y-3 lg:sticky lg:top-4">
        <div className="rounded-lg border border-subtle bg-surface p-4 text-sm">
          <h2 className="mb-2 font-heading text-sm font-semibold">Summary</h2>
          <dl className="space-y-1.5">
            <Row label="Subtotal" value={money(totals.subtotal)} />
            {totals.discount > 0 && <Row label="Discount" value={`− ${money(totals.discount)}`} />}
            {taxed && <Row label="Taxable value" value={money(totals.taxable)} />}
            {taxed && !totals.interState && <Row label="CGST" value={money(totals.cgst)} />}
            {taxed && !totals.interState && <Row label="SGST" value={money(totals.sgst)} />}
            {taxed && totals.interState && <Row label="IGST" value={money(totals.igst)} />}
            {totals.roundOff !== 0 && <Row label="Round off" value={money(totals.roundOff)} />}
            <Row label="Invoice total" value={money(totals.total)} strong />
            {totals.advanceAdjusted > 0 && <Row label="Less: advance" value={`− ${money(totals.advanceAdjusted)}`} />}
            {totals.retention > 0 && <Row label="Less: retention" value={`− ${money(totals.retention)}`} />}
            {(totals.advanceAdjusted > 0 || totals.retention > 0) && <Row label="Payable" value={money(totals.payable)} strong />}
          </dl>
          <p className="mt-3 text-xs text-ink-muted">{amountInWords(Math.max(0, totals.payable))}</p>
          {!taxed && <p className="mt-2 text-xs text-ink-faint">No GST on this document ({profile.gst_registered ? DOC_TYPES[p.docType].label : 'business not GST-registered'}).</p>}
        </div>
        <Button variant="primary" className="w-full" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : p.id ? 'Save draft' : 'Save draft & preview'}
        </Button>
        <p className="text-xs text-ink-faint">Drafts have no number. The number is assigned when you issue.</p>
      </aside>

      {newClient && (
        <Drawer label="New client" onClose={() => setNewClient(false)}>
          <ClientForm onSaved={(id) => { setNewClient(false); router.refresh(); set('clientId', id) }} />
        </Drawer>
      )}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t border-subtle pt-1.5 font-semibold text-ink' : 'text-ink-muted'}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
