import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HierarchySidebar } from '@/components/HierarchySidebar'
import { TicketList } from '@/components/TicketList'
import { TicketFilters } from '@/components/TicketFilters'
import { NewTicketForm } from '@/components/NewTicketForm'

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string; discipline?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('name, code').eq('id', id).single()
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name, floors(id, name, rooms(id, name))')
    .eq('project_id', id)

  let q = supabase
    .from('tickets')
    .select('id, seq, type, discipline, title, status, priority, due_date')
    .eq('project_id', id)
    .order('seq', { ascending: false })
  if (sp.status) q = q.eq('status', sp.status as never)
  if (sp.discipline) q = q.eq('discipline', sp.discipline as never)
  const { data: tickets } = await q

  return (
    <main className="flex gap-6">
      <HierarchySidebar projectId={id} buildings={(buildings as never) ?? []} />
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{project?.name}</h1>
          <Link href={`/projects/${id}/drawings`} className="text-sm text-gray-500">Drawings →</Link>
        </div>
        <NewTicketForm projectId={id} />
        <TicketFilters />
        <TicketList tickets={(tickets as never) ?? []} />
      </div>
    </main>
  )
}
