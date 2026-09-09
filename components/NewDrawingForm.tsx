'use client'
import { createDrawing } from '@/app/(app)/drawing-actions'

const DISCIPLINE = ['', 'architectural', 'structural', 'electrical', 'plumbing', 'fire_safety',
  'interior', 'landscape', 'construction', 'documentation', 'client_coordination']

export function NewDrawingForm({ projectId }: { projectId: string }) {
  return (
    <form action={createDrawing} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="project_id" value={projectId} />
      <input name="title" placeholder="Drawing title" required className="rounded border p-1" />
      <input name="drawing_number" placeholder="Sheet no (E-101)" className="rounded border p-1" />
      <select name="discipline" className="rounded border p-1">
        {DISCIPLINE.map((d) => <option key={d} value={d}>{d || 'discipline'}</option>)}
      </select>
      <button type="submit" className="rounded bg-black px-3 text-white">Add drawing</button>
    </form>
  )
}
