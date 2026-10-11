import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { InvoiceEditor, type EditorProfile } from '@/components/invoice/InvoiceEditor'
import type { ClientRow } from '@/components/invoice/ClientForm'
import { editorData, newPayload } from '@/lib/invoice/payload'
import { todayIST } from '@/lib/invoice/rules'

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ client?: string; project?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { profile, clients, projects } = await editorData(supabase)
  if (!profile) {
    return (
      <main>
        <PageHeader title="New invoice" />
        <EmptyState
          title="Set up your practice first"
          description="Add your firm name, address and tax details once — every invoice fills them in automatically."
          action={<Link href="/invoices/settings" className="text-sm font-medium text-primary hover:underline">Open billing settings →</Link>}
        />
      </main>
    )
  }
  const proj = projects.find((x) => x.id === sp.project)
  const clientId = sp.client ?? proj?.client_id ?? null
  const initial = newPayload(profile, todayIST(), {
    clientId, projectId: proj?.id ?? null,
    placeOfSupply: proj?.site_state ?? clients.find((c) => c.id === clientId)?.state ?? null,
  })
  return (
    <main>
      <PageHeader title="New invoice" />
      <InvoiceEditor initial={initial} profile={profile as EditorProfile} clients={clients as ClientRow[]} projects={projects} />
    </main>
  )
}
