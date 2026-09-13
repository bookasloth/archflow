'use client'
import { createTicket } from '@/app/(app)/actions'
import { DrawingRevisionSelect, type RevisionOption } from '@/components/DrawingRevisionSelect'

export type MaterialOption = { id: string; label: string }
export type Assignee = { id: string; full_name: string | null }

const DISCIPLINE = ['architectural', 'structural', 'electrical', 'plumbing', 'fire_safety',
  'interior', 'landscape', 'construction', 'documentation', 'client_coordination']

export function NewTicketForm({ projectId, revisionOptions = [], materials = [], assignees = [], currentUserId, buildingId, floorId, roomId }:
  { projectId: string; revisionOptions?: RevisionOption[]; materials?: MaterialOption[]; assignees?: Assignee[]; currentUserId?: string; buildingId?: string; floorId?: string; roomId?: string }) {
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
      {assignees.length > 0 && (
        <select name="assignee_id" aria-label="Assignee" className="rounded border p-1" defaultValue={currentUserId ?? ''}>
          {assignees.map((a) => <option key={a.id} value={a.id}>{a.full_name ?? 'Unnamed'}</option>)}
        </select>
      )}
      <input name="start_date" type="date" aria-label="Start date" className="rounded border p-1" />
      <input name="due_date" type="date" aria-label="Due date" className="rounded border p-1" />
      {revisionOptions.length > 0 && <DrawingRevisionSelect options={revisionOptions} />}
      {materials.length > 0 && (
        <select name="material_id" className="rounded border p-1" defaultValue="">
          <option value="">no material</option>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      )}
      <button className="rounded bg-primary px-3 hover:bg-primary-hover text-white">Add</button>
    </form>
  )
}
