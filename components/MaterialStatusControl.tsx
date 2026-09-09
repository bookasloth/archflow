import { nextMaterialStatuses, type MaterialStatus } from '@/lib/materials'
import { setMaterialStatus } from '@/app/(app)/material-actions'

const LABEL: Record<MaterialStatus, string> = {
  approved: 'Approve',
  rejected: 'Reject',
  proposed: 'Reopen',
}

export function MaterialStatusControl({ id, status }: { id: string; status: MaterialStatus }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded bg-gray-100 px-2 py-1">{status}</span>
      {nextMaterialStatuses(status).map((to) => (
        <form key={to} action={setMaterialStatus}>
          <input type="hidden" name="material_id" value={id} />
          <input type="hidden" name="to" value={to} />
          <button type="submit" className="rounded border px-2 py-1">{LABEL[to]}</button>
        </form>
      ))}
    </div>
  )
}
