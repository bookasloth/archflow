'use client'
import { createMaterial } from '@/app/(app)/material-actions'

export type RoomOption = { id: string; name: string }
export type DrawingOption = { id: string; label: string }

const CATEGORY = ['flooring', 'wall_finish', 'ceiling', 'joinery', 'sanitary', 'lighting',
  'hardware', 'paint', 'glazing', 'landscape', 'other']

export function NewMaterialForm({ projectId, rooms, drawings = [] }:
  { projectId: string; rooms: RoomOption[]; drawings?: DrawingOption[] }) {
  return (
    <form action={createMaterial} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="project_id" value={projectId} />
      <input name="name" placeholder="Material name" required className="rounded border p-1" />
      <select name="category" className="rounded border p-1">
        {CATEGORY.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
      </select>
      <select name="room_id" className="rounded border p-1" defaultValue="">
        <option value="">no room</option>
        {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      {drawings.length > 0 && (
        <select name="drawing_id" className="rounded border p-1" defaultValue="">
          <option value="">no drawing</option>
          {drawings.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      )}
      <input name="manufacturer" placeholder="Manufacturer" className="rounded border p-1" />
      <input name="product_code" placeholder="Code" className="rounded border p-1" />
      <input name="finish" placeholder="Finish" className="rounded border p-1" />
      <input name="color" placeholder="Colour" className="rounded border p-1" />
      <input name="size" placeholder="Size" className="rounded border p-1" />
      <input name="cost" type="number" step="0.01" placeholder="Cost" className="w-24 rounded border p-1" />
      <input name="supplier" placeholder="Supplier" className="rounded border p-1" />
      <input name="notes" placeholder="Notes" className="rounded border p-1" />
      <button type="submit" className="rounded bg-black px-3 text-white">Add material</button>
    </form>
  )
}
