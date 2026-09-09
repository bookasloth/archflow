'use client'
export function KanbanBoard({ tickets }: { tickets: unknown[] }) {
  return <div className="text-sm text-gray-500">Kanban ({tickets.length} tickets)</div>
}
