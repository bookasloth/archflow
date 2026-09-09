'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addMaterialAttachment } from '@/app/(app)/material-actions'

export function AddMaterialAttachment({ materialId, projectId }: { materialId: string; projectId: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'photo' | 'datasheet'>('photo')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop() || 'bin'
      const path = `${projectId}/${materialId}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await createClient().storage.from('material-files').upload(path, file)
      if (upErr) {
        setError(upErr.message)
        return
      }
      await addMaterialAttachment({ materialId, projectId, storagePath: path, kind })
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
        <select value={kind} onChange={(e) => setKind(e.target.value as 'photo' | 'datasheet')}
          className="rounded border p-1 text-sm">
          <option value="photo">photo</option>
          <option value="datasheet">datasheet</option>
        </select>
        <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button disabled={!file || busy} onClick={submit}
          className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50">
          {busy ? 'Uploading…' : 'Add'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
