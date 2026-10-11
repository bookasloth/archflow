import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { InvoiceEditor, type EditorProfile } from '@/components/invoice/InvoiceEditor'
import type { ClientRow } from '@/components/invoice/ClientForm'
import { editorData, payloadFromRows } from '@/lib/invoice/payload'
import { isUuid } from '@/lib/invoice/data'

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const supabase = await createClient()
  const [{ data: inv }, { data: lines }, data] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).maybeSingle(),
    supabase.from('invoice_lines').select('*').eq('invoice_id', id).order('position'),
    editorData(supabase),
  ])
  if (!inv) notFound()
  if (inv.status !== 'draft' || !data.profile) redirect(`/invoices/${id}`) // issued documents are frozen
  return (
    <main>
      <PageHeader title="Edit draft" />
      <InvoiceEditor
        initial={payloadFromRows(inv, lines ?? [])}
        profile={data.profile as EditorProfile}
        clients={data.clients as ClientRow[]}
        projects={data.projects}
      />
    </main>
  )
}
