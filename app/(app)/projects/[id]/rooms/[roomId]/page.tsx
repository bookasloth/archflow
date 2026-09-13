import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/EmptyState'
import { TicketList } from '@/components/TicketList'
import { TicketDrawer } from '@/components/TicketDrawer'
import { NewTicketForm } from '@/components/NewTicketForm'

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>
}) {
  const { id, roomId } = await params
  const supabase = await createClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, floor_id, floors(name, building_id, buildings(name, project_id))')
    .eq('id', roomId)
    .single()
  if (!room) notFound()
  type RoomCtx = {
    id: string; name: string; floor_id: string
    floors: { name: string; building_id: string; buildings: { name: string; project_id: string } | null } | null
  }
  const r = room as unknown as RoomCtx
  const floorName = r.floors?.name ?? ''
  const buildingName = r.floors?.buildings?.name ?? ''
  const buildingId = r.floors?.building_id

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, seq, type, discipline, title, status, priority, due_date, assignee:assignee_id(full_name), building:building_id(name), floor:floor_id(name), room:room_id(name)')
    .eq('room_id', roomId)
    .order('seq', { ascending: false })
  const all = (tickets as never[]) ?? []
  const tasks = all.filter((t: { type: string }) => t.type === 'task')
  const site = all.filter((t: { type: string }) => t.type === 'site_issue')

  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, status, category')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
  type Mat = { id: string; name: string; status: string; category: string }
  const mats = (materials as Mat[]) ?? []

  const { data: profiles } = await supabase.from('profiles').select('id, full_name').order('full_name')
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title={r.name}
        meta={
          <>
            {buildingName && <span>{buildingName}</span>}
            {floorName && <span>· {floorName}</span>}
          </>
        }
      />

      <Section title="New ticket in this room">
        <NewTicketForm
          projectId={id}
          buildingId={buildingId}
          floorId={r.floor_id}
          roomId={r.id}
          materials={mats.map((m) => ({ id: m.id, label: m.name }))}
          assignees={(profiles as { id: string; full_name: string | null }[]) ?? []}
          currentUserId={user?.id}
        />
      </Section>

      <Section title={`Work · ${tasks.length}`}>
        <TicketList tickets={tasks as never} />
      </Section>

      <Section title={`Site issues · ${site.length}`}>
        <TicketList tickets={site as never} />
      </Section>

      <Section title={`Materials · ${mats.length}`}>
        {mats.length === 0 ? (
          <EmptyState title="No materials for this room" />
        ) : (
          <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
            {mats.map((m) => (
              <li key={m.id} className="hover:bg-surface-hover">
                <Link href={`/materials/${m.id}`} className="flex items-center justify-between p-2.5">
                  <span className="text-ink">{m.name}</span>
                  <span className="text-xs text-ink-muted">{m.category} · {m.status.replace(/_/g, ' ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <TicketDrawer />
    </div>
  )
}
