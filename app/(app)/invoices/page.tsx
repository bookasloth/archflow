import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { InvoiceStatusBadge } from '@/components/invoice/InvoiceStatusBadge'
import { DuplicateButton } from '@/components/invoice/DuplicateButton'
import { formatINR } from '@/lib/invoice/money'
import { formatDate } from '@/lib/invoice/model'
import { deriveStatus, STATUS_LABEL, todayIST, type InvoiceStatus, type StoredStatus } from '@/lib/invoice/rules'

type Row = {
  id: string; number: string | null; status: StoredStatus; invoice_date: string; due_date: string | null
  payable: number; created_at: string
  client: { name: string } | null; project: { name: string } | null
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const [{ data: invoices }, { data: payments }, { data: profile }] = await Promise.all([
    supabase.from('invoices')
      .select('id, number, status, invoice_date, due_date, payable, created_at, client:client_id(name), project:project_id(name)')
      .order('created_at', { ascending: false }),
    supabase.from('invoice_payments').select('invoice_id, amount').is('voided_at', null),
    supabase.from('business_profile').select('firm_name').maybeSingle(),
  ])
  const paidBy = new Map<string, number>()
  for (const p of payments ?? []) paidBy.set(p.invoice_id, (paidBy.get(p.invoice_id) ?? 0) + Number(p.amount))

  const today = todayIST()
  const all = ((invoices ?? []) as unknown as Row[]).map((i) => {
    const paid = paidBy.get(i.id) ?? 0
    const payable = Number(i.payable)
    const status = deriveStatus({ status: i.status, payable, paid, dueDate: i.due_date }, today)
    return { ...i, payable, paid, balance: Math.max(0, payable - paid), derived: status }
  })

  // Money stats count issued documents only (not drafts, not cancelled).
  const live = all.filter((i) => i.status === 'issued')
  const sum = (xs: typeof all, k: 'payable' | 'paid' | 'balance') => xs.reduce((a, x) => a + x[k], 0)
  const stats = [
    { label: 'Invoiced', value: formatINR(sum(live, 'payable')), sub: `${live.length} issued` },
    { label: 'Collected', value: formatINR(sum(live, 'paid')) },
    { label: 'Outstanding', value: formatINR(sum(live, 'balance')) },
    { label: 'Overdue', value: formatINR(sum(live.filter((i) => i.derived === 'overdue'), 'balance')), danger: true },
    { label: 'Drafts', value: String(all.filter((i) => i.status === 'draft').length) },
  ]

  // ponytail: filter in memory — fine for a practice's invoice volume; push to SQL past ~5k invoices.
  const q = (sp.q ?? '').trim().toLowerCase()
  const status = sp.status as InvoiceStatus | undefined
  const rows = all.filter((i) =>
    (!status || i.derived === status) &&
    (!q || [i.number, i.client?.name, i.project?.name].some((s) => s?.toLowerCase().includes(q))),
  )

  return (
    <main className="space-y-5">
      <PageHeader
        title="Invoices"
        meta={profile ? <span>{profile.firm_name}</span> : <Link href="/invoices/settings" className="text-primary hover:underline">Set up your business profile first →</Link>}
        actions={<Link href="/invoices/new" className="inline-flex h-9 items-center rounded bg-primary px-3.5 text-sm font-medium text-primary-fg hover:bg-primary-hover">＋ New invoice</Link>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-subtle bg-surface p-3">
            <div className="text-xs text-ink-muted">{s.label}</div>
            <div className={`mt-1 font-heading text-lg font-semibold tabular-nums ${s.danger && s.value !== formatINR(0) ? 'text-danger' : 'text-ink'}`}>{s.value}</div>
            {s.sub && <div className="text-xs text-ink-faint">{s.sub}</div>}
          </div>
        ))}
      </div>

      <form className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Search number, client or project"
          className="h-9 min-w-0 flex-1 rounded border border-subtle bg-surface px-3 text-sm sm:max-w-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
        <select name="status" defaultValue={sp.status ?? ''} className="h-9 rounded border border-subtle bg-surface px-2 text-sm">
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <button className="h-9 rounded border border-subtle bg-surface px-3 text-sm hover:bg-surface-hover">Filter</button>
      </form>

      {all.length === 0 ? (
        <EmptyState title="No invoices yet" description="Create your first invoice — your practice details fill in automatically."
          action={<Link href="/invoices/new" className="text-sm font-medium text-primary hover:underline">Create an invoice →</Link>} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing matches" description="Try a different search or status." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-subtle bg-surface">
          <table className="w-full min-w-[920px] whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-subtle text-left text-xs text-ink-faint">
                <th className="px-3 py-2 font-medium">Invoice</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Paid</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {rows.map((i) => (
                <tr key={i.id} className="hover:bg-surface-hover">
                  <td className="px-3 py-2">
                    <Link href={`/invoices/${i.id}`} className="font-mono text-xs font-medium text-ink hover:underline">{i.number ?? 'Draft'}</Link>
                  </td>
                  <td className="px-3 py-2 text-ink">{i.client?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-ink-muted">{i.project?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-ink-muted">{formatDate(i.invoice_date)}</td>
                  <td className="px-3 py-2 text-ink-muted">{formatDate(i.due_date)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(i.payable)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{formatINR(i.paid)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{formatINR(i.status === 'issued' ? i.balance : 0)}</td>
                  <td className="px-3 py-2"><InvoiceStatusBadge status={i.derived} /></td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex items-center gap-3">
                      {i.status === 'draft' && <Link href={`/invoices/${i.id}/edit`} className="text-xs text-ink-muted hover:underline">Edit</Link>}
                      <a href={`/api/invoices/${i.id}/pdf?download=1`} className="text-xs text-ink-muted hover:underline">PDF</a>
                      <DuplicateButton id={i.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
