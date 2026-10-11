import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProjectBilling, type ProjectWithBilling } from '@/components/invoice/ProjectBilling'

export default async function InvoiceProjectsPage() {
  const supabase = await createClient()
  const [{ data: projects }, { data: billing }, { data: clients }] = await Promise.all([
    supabase.from('projects').select('id, name, code').order('name'),
    supabase.from('project_billing').select('*'),
    supabase.from('clients').select('id, name').order('name'),
  ])
  const byId = new Map((billing ?? []).map((b) => [b.project_id, b]))
  const rows: ProjectWithBilling[] = (projects ?? []).map((p) => ({ ...p, billing: (byId.get(p.id) as ProjectWithBilling['billing']) ?? null }))
  return (
    <main>
      <PageHeader title="Projects" meta={<span>Billing details for your Archflow projects (visible to admins only).</span>} />
      <ProjectBilling projects={rows} clients={clients ?? []} />
    </main>
  )
}
