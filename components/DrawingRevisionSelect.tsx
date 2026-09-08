'use client'
import { useState } from 'react'
import { formatRevision } from '@/lib/revision-status'

export type RevisionOption = { revisionId: string; drawingId: string; label: string }

export function DrawingRevisionSelect({ options }: { options: RevisionOption[] }) {
  const [drawingId, setDrawingId] = useState('')
  const selected = options.find((o) => o.revisionId === drawingId)
  return (
    <>
      <select
        className="rounded border p-1"
        defaultValue=""
        onChange={(e) => setDrawingId(e.target.value)}
        name="drawing_revision_id"
      >
        <option value="">no drawing</option>
        {options.map((o) => (
          <option key={o.revisionId} value={o.revisionId}>{o.label}</option>
        ))}
      </select>
      <input type="hidden" name="drawing_id" value={selected?.drawingId ?? ''} />
    </>
  )
}

export { formatRevision }
