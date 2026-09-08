'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createRevision } from '@/app/(app)/drawing-actions'

export function UploadRevision({ drawingId, projectId }: { drawingId: string; projectId: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!file) return
    setBusy(true)
    const ext = file.name.split('.').pop() || 'pdf'
    const path = `${projectId}/${drawingId}/${crypto.randomUUID()}.${ext}`
    await createClient().storage.from('drawing-files').upload(path, file)
    await createRevision({ drawingId, projectId, storagePath: path })
    setFile(null)
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept=".pdf,image/*,.dwg,.dxf,.rvt"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        disabled={!file || busy}
        onClick={submit}
        className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        {busy ? 'Uploading…' : 'Upload revision'}
      </button>
    </div>
  )
}
