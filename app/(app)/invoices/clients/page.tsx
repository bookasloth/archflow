import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { ClientManager } from '@/components/invoice/ClientManager'
import type { ClientRow } from '@/components/invoice/ClientForm'

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const supabase = await createClient()
  let query = supabase.from('clients').select('*').order('name')
  const term = q.trim().replace(/[%,()]/g, ' ')
  if (term) query = query.or(`name.ilike.%${term}%,contact_person.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
  const { data } = await query
  return (
    <main>
      <PageHeader title="Clients" />
      <ClientManager clients={(data ?? []) as ClientRow[]} q={q} />
    </main>
  )
}
