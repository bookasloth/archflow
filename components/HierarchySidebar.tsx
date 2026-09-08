import { addBuilding, addFloor, addRoom } from '@/app/(app)/actions'

type Room = { id: string; name: string }
type Floor = { id: string; name: string; rooms: Room[] }
type Building = { id: string; name: string; floors: Floor[] }

export function HierarchySidebar({ projectId, buildings }: { projectId: string; buildings: Building[] }) {
  return (
    <aside className="w-64 space-y-3 border-r pr-3 text-sm">
      <h3 className="font-semibold">Spaces</h3>
      {buildings.map((b) => (
        <div key={b.id} className="space-y-1">
          <div className="font-medium">{b.name}</div>
          {b.floors.map((f) => (
            <div key={f.id} className="ml-3">
              <div>{f.name}</div>
              {f.rooms.map((r) => (
                <div key={r.id} className="ml-3 text-gray-600">{r.name}</div>
              ))}
              <form action={addRoom} className="ml-3 flex gap-1">
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="floor_id" value={f.id} />
                <input name="name" placeholder="+ room" className="w-full rounded border px-1" />
              </form>
            </div>
          ))}
          <form action={addFloor} className="ml-3 flex gap-1">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="building_id" value={b.id} />
            <input name="name" placeholder="+ floor" className="w-full rounded border px-1" />
          </form>
        </div>
      ))}
      <form action={addBuilding} className="flex gap-1">
        <input type="hidden" name="project_id" value={projectId} />
        <input name="name" placeholder="+ building" className="w-full rounded border px-1" />
      </form>
    </aside>
  )
}
