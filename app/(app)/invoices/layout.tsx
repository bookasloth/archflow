import { getCurrentUserWithRole } from '@/lib/auth'
import { InvoiceTabs } from '@/components/invoice/InvoiceTabs'

// Invoicing is admin-only. The database enforces it (RLS); this just explains it instead of
// showing empty pages to staff.
export default async function InvoicesLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getCurrentUserWithRole()
  if (role !== 'admin') {
    return (
      <div className="max-w-xl rounded-lg border border-subtle bg-surface p-6">
        <h1 className="font-heading text-lg font-semibold text-ink">Invoices are admin-only</h1>
        <p className="mt-1 text-sm text-ink-muted">Ask a workspace admin for access to billing.</p>
      </div>
    )
  }
  return (
    <div className="max-w-6xl space-y-5">
      <InvoiceTabs />
      {children}
    </div>
  )
}
