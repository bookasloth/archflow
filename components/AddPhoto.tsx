'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PhotoMarker, type Marker } from '@/components/PhotoMarker'
import { saveAttachment } from '@/app/(app)/media-actions'

export function AddPhoto({
  ticketId,
  projectId,
  kind,
  onSaved,
}: {
  ticketId: string
  projectId: string
  kind: 'before' | 'after' | 'reference'
  onSaved?: () => void
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [markers, setMarkers] = useState<Marker[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setMarkers([])
    setPreview(f ? URL.createObjectURL(f) : '')
  }

  async function submit() {
    if (!file) return
    setBusy(true)
    setError(null)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${projectId}/${ticketId}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await createClient().storage.from('ticket-media').upload(path, file)
    if (upErr) {
      setError(`Upload failed: ${upErr.message}`)
      setBusy(false)
      return
    }
    await saveAttachment({ ticketId, projectId, storagePath: path, kind, markers })
    setFile(null)
    setPreview('')
    setMarkers([])
    setBusy(false)
    router.refresh()
    onSaved?.()
  }

  return (
    <div className="space-y-2">
      <input type="file" accept="image/*" capture="environment" onChange={onFile} />
      {preview && <PhotoMarker src={preview} value={markers} editable onChange={setMarkers} />}
      {preview && (
        <button
          disabled={busy}
          onClick={submit}
          className="rounded bg-primary px-3 hover:bg-primary-hover py-1 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Uploading…' : `Save ${kind} photo`}
        </button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
