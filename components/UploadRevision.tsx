'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createRevision } from '@/app/(app)/drawing-actions'

export function UploadRevision({ drawingId, projectId }: { drawingId: string; projectId: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const path = `${projectId}/${drawingId}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await createClient().storage.from('drawing-files').upload(path, file)
      if (upErr) {
        setError(upErr.message)
        return
      }
      await createRevision({ drawingId, projectId, storagePath: path })
      setFile(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept=".pdf,image/*,.dwg,.dxf,.rvt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          disabled={!file || busy}
          onClick={submit}
          className="rounded bg-primary px-3 hover:bg-primary-hover py-1 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Upload revision'}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
