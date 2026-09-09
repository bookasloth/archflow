'use client'
import { createTicket } from '@/app/(app)/actions'
import { DrawingRevisionSelect, type RevisionOption } from '@/components/DrawingRevisionSelect'

const DISCIPLINE = ['architectural', 'structural', 'electrical', 'plumbing', 'fire_safety',
  'interior', 'landscape', 'construction', 'documentation', 'client_coordination']

export function NewTicketForm({ projectId, revisionOptions = [], buildingId, floorId, roomId }:
  { projectId: string; revisionOptions?: RevisionOption[]; buildingId?: string; floorId?: string; roomId?: string }) {
  return (
    <form action={createTicket} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="project_id" value={projectId} />
      {buildingId && <input type="hidden" name="building_id" value={buildingId} />}
      {floorId && <input type="hidden" name="floor_id" value={floorId} />}
      {roomId && <input type="hidden" name="room_id" value={roomId} />}
      <input name="title" placeholder="Ticket title" required className="rounded border p-1" />
      <select name="type" className="rounded border p-1">
        <option value="task">task</option>
        <option value="site_issue">site_issue</option>
      </select>
      <select name="discipline" className="rounded border p-1">
        {DISCIPLINE.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      <select name="priority" className="rounded border p-1" defaultValue="medium">
        {['low', 'medium', 'high', 'critical'].map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <input name="due_date" type="date" className="rounded border p-1" />
      {revisionOptions.length > 0 && <DrawingRevisionSelect options={revisionOptions} />}
      <button className="rounded bg-black px-3 text-white">Add</button>
    </form>
  )
}
