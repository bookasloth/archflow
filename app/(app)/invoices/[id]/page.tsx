import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadInvoice, isUuid } from '@/lib/invoice/data'
import { formatDate } from '@/lib/invoice/model'
import { formatINR } from '@/lib/invoice/money'
import { todayIST, type StoredStatus } from '@/lib/invoice/rules'
import { pdfFileName } from '@/lib/invoice/pdf/fileName'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { InvoiceStatusBadge } from '@/components/invoice/InvoiceStatusBadge'
import { InvoiceActions } from '@/components/invoice/InvoiceActions'
import { InvoicePreview } from '@/components/invoice/InvoicePreview'
import { PaymentsPanel, type PaymentRow } from '@/components/invoice/PaymentsPanel'

const EVENT_LABEL: Record<string, string> = {
  created: 'Draft created', edited: 'Draft edited', issued: 'Issued', duplicated: 'Duplicated',
  payment_recorded: 'Payment recorded', payment_voided: 'Payment voided', cancelled: 'Cancelled',
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const supabase = await createClient()
  const r = await loadInvoice(supabase, id)
  if (!r) notFound()
  const { invoice: inv, doc, payments, events } = r
  if (!doc) {
    return (
      <main className="space-y-2">
        <PageHeader title="Invoice" />
        <p className="text-sm text-ink-muted">
          {r.missing === 'profile' ? <>Set up the <Link className="text-primary underline" href="/invoices/settings">business profile</Link> first.</> : 'This invoice’s client no longer exists.'}
        </p>
      </main>
    )
  }

  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`
  const link = inv.share_token && inv.status !== 'draft' ? `${origin}/i/${inv.share_token}` : null
  const greet = doc.buyer.contact_person || doc.buyer.name
  const message = [
    `Hello ${greet},`,
    '',
    `Please find ${doc.title} ${doc.number ?? '(draft)'} from ${doc.seller.firm_name}${doc.project ? ` for ${doc.project.name}` : ''}.`,
    `Amount due: ${formatINR(doc.balance)}${doc.dueDate ? `, due by ${formatDate(doc.dueDate)}` : ''}.`,
    link ? `View or download the invoice (PDF): ${link}` : '',
    '',
    'Thank you,',
    doc.seller.firm_name,
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n')

  const pdfUrl = `/api/invoices/${id}/pdf`
  return (
    <main className="space-y-6">
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{doc.number ?? 'Draft invoice'} <InvoiceStatusBadge status={doc.status} /></span>}
        meta={
          <>
            <span>{doc.title}</span>
            <span>· {doc.buyer.name}</span>
            {doc.project && <span>· {doc.project.name}</span>}
            <span>· {formatDate(doc.invoiceDate)}</span>
          </>
        }
        actions={<Link href="/invoices" className="text-sm text-ink-muted hover:text-ink">← All invoices</Link>}
      />

      <InvoiceActions
        id={id}
        status={inv.status as StoredStatus}
        number={doc.number}
        share={{
          link, pdfUrl, fileName: pdfFileName(doc), title: `${doc.title} ${doc.number ?? ''}`.trim(),
          clientName: doc.buyer.name, clientPhone: doc.buyer.phone, clientEmail: doc.buyer.email, message,
        }}
      />
      {inv.status === 'cancelled' && <p className="text-sm text-ink-muted">Cancelled — {inv.cancel_reason}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Section title="Preview">
          <InvoicePreview pdfUrl={pdfUrl} initial={doc.template} />
        </Section>

        <div className="space-y-6">
          <Section title="Amounts">
            <dl className="space-y-1.5 rounded-lg border border-subtle bg-surface p-4 text-sm">
              <Row label="Invoice total" value={formatINR(doc.totals.total)} />
              {doc.totals.advanceAdjusted > 0 && <Row label="Less advance" value={`− ${formatINR(doc.totals.advanceAdjusted)}`} />}
              {doc.totals.retention > 0 && <Row label="Less retention" value={`− ${formatINR(doc.totals.retention)}`} />}
              <Row label="Payable" value={formatINR(doc.totals.payable)} />
              <Row label="Paid" value={formatINR(doc.paid)} />
              <Row label="Balance due" value={formatINR(doc.balance)} strong />
              <Row label="Due date" value={formatDate(doc.dueDate)} />
            </dl>
          </Section>

          {inv.status !== 'draft' && (
            <Section title="Payments">
              <PaymentsPanel
                invoiceId={id}
                payments={payments as unknown as PaymentRow[]}
                balance={doc.balance}
                canRecord={inv.status === 'issued' && doc.balance > 0}
                today={todayIST()}
              />
            </Section>
          )}

          <Section title="History">
            <ol className="space-y-1 text-xs text-ink-muted">
              {(events as unknown as { id: number; kind: string; detail: Record<string, unknown> | null; at: string; actor: { full_name: string | null } | null }[]).map((e) => (
                <li key={e.id}>
                  <span className="text-ink">{EVENT_LABEL[e.kind] ?? e.kind}</span>
                  {e.kind === 'issued' && e.detail?.number ? ` as ${e.detail.number}` : ''}
                  {e.kind.startsWith('payment') && e.detail?.amount ? ` ${formatINR(Number(e.detail.amount))}` : ''}
                  {e.kind === 'cancelled' && e.detail?.reason ? ` — ${e.detail.reason}` : ''}
                  {' · '}{new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                  {e.actor?.full_name ? ` · ${e.actor.full_name}` : ''}
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </main>
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
