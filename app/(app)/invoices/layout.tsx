import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
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
  // Code can ship before the database: until 0011/0012 run, explain instead of erroring.
  const supabase = await createClient()
  const { error } = await supabase.from('business_profile').select('id').limit(0)
  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return (
      <div className="max-w-xl rounded-lg border border-subtle bg-surface p-6">
        <h1 className="font-heading text-lg font-semibold text-ink">Invoicing isn’t set up in the database yet</h1>
        <p className="mt-1 text-sm text-ink-muted">
          In the Supabase SQL editor, run <code>supabase/migrations/0011_invoicing.sql</code> and then{' '}
          <code>0012_api_grants.sql</code>. Reload this page afterwards.
        </p>
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
