import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewMaterialForm, type RoomOption } from '@/components/NewMaterialForm'
import { MaterialList } from '@/components/MaterialList'
import { MaterialFilters } from '@/components/MaterialFilters'

type MaterialRow = {
  id: string; name: string; manufacturer: string | null; category: string
  status: string; rooms: { name: string } | null
}
type BuildingTree = { floors: { rooms: { id: string; name: string }[] }[] }

export default async function MaterialsPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string; category?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('name').eq('id', id).single()

  const { data: buildingTree } = await supabase
    .from('buildings')
    .select('floors(rooms(id, name))')
    .eq('project_id', id)
  const rooms: RoomOption[] = ((buildingTree as unknown as BuildingTree[]) ?? [])
    .flatMap((b) => b.floors ?? [])
    .flatMap((f) => f.rooms ?? [])

  let q = supabase
    .from('materials')
    .select('id, name, manufacturer, category, status, rooms(name)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
  if (sp.status) q = q.eq('status', sp.status as never)
  if (sp.category) q = q.eq('category', sp.category as never)
  const { data: rows } = await q

  const materials = ((rows as unknown as MaterialRow[]) ?? []).map((m) => ({
    id: m.id, name: m.name, manufacturer: m.manufacturer, category: m.category,
    status: m.status, room: m.rooms?.name ?? null,
  }))

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{project?.name} — Materials</h1>
        <Link href={`/projects/${id}`} className="text-sm text-gray-500">← project</Link>
      </div>
      <NewMaterialForm projectId={id} rooms={rooms} />
      <MaterialFilters />
      <MaterialList materials={materials} />
    </main>
  )
}
