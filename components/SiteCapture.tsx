'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PhotoMarker, type Marker } from '@/components/PhotoMarker'
import { createSiteIssue, saveAttachment } from '@/app/(app)/media-actions'

const DISCIPLINE = ['architectural', 'structural', 'electrical', 'plumbing', 'fire_safety',
  'interior', 'landscape', 'construction', 'documentation', 'client_coordination']

export function SiteCapture({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter()
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [markers, setMarkers] = useState<Marker[]>([])
  const [title, setTitle] = useState('')
  const [discipline, setDiscipline] = useState('architectural')
  const [priority, setPriority] = useState('high')
  const [busy, setBusy] = useState(false)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setMarkers([])
    setPreview(f ? URL.createObjectURL(f) : '')
  }

  async function submit() {
    if (!file || !title || !projectId) return
    setBusy(true)
    const ticketId = await createSiteIssue({ projectId, title, discipline, priority })
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${projectId}/${ticketId}/${crypto.randomUUID()}.${ext}`
    const supabase = createClient()
    await supabase.storage.from('ticket-media').upload(path, file)
    await saveAttachment({ ticketId, projectId, storagePath: path, kind: 'before', markers })
    router.push(`/tickets/${ticketId}`)
  }

  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-lg font-semibold">Site Visit</h1>
      <select
        className="w-full rounded border p-2"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input type="file" accept="image/*" capture="environment" onChange={onFile} className="w-full" />
      {preview && <PhotoMarker src={preview} value={markers} editable onChange={setMarkers} />}
      {preview && (
        <p className="text-xs text-gray-500">Tap the photo to mark problem spots ({markers.length}).</p>
      )}
      <input
        className="w-full rounded border p-2"
        placeholder="What's the issue?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex gap-2">
        <select
          className="flex-1 rounded border p-2"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
        >
          {DISCIPLINE.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          className="rounded border p-2"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {['low', 'medium', 'high', 'critical'].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <button
        disabled={busy}
        onClick={submit}
        className="w-full rounded bg-black p-2 text-white disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Submit issue'}
      </button>
    </div>
  )
}
