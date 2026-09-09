import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signedMaterialUrl } from '@/app/(app)/material-actions'
import { categoryLabel, type MaterialStatus } from '@/lib/materials'
import { MaterialStatusControl } from '@/components/MaterialStatusControl'
import { MaterialAttachments } from '@/components/MaterialAttachments'
import { AddMaterialAttachment } from '@/components/AddMaterialAttachment'

type MaterialRow = {
  id: string; project_id: string; category: string; name: string; manufacturer: string | null
  product_code: string | null; finish: string | null; color: string | null; size: string | null
  cost: number | null; supplier: string | null; notes: string | null; status: MaterialStatus
  rooms: { name: string } | null
}
type AttRow = { id: string; storage_path: string; kind: string }

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: m } = await supabase
    .from('materials')
    .select('id, project_id, category, name, manufacturer, product_code, finish, color, size, cost, supplier, notes, status, rooms(name)')
    .eq('id', id)
    .single()
  if (!m) notFound()
  const mat = m as unknown as MaterialRow

  const { data: attRows } = await supabase
    .from('material_attachments')
    .select('id, storage_path, kind')
    .eq('material_id', id)
    .order('created_at')
  const attachments = await Promise.all(
    ((attRows as unknown as AttRow[]) ?? []).map(async (a) => ({
      id: a.id, kind: a.kind, ext: (a.storage_path.split('.').pop() || '').toLowerCase(),
      url: await signedMaterialUrl(a.storage_path),
    })),
  )

  const fields: [string, string | number | null][] = [
    ['Manufacturer', mat.manufacturer], ['Code', mat.product_code], ['Finish', mat.finish],
    ['Colour', mat.color], ['Size', mat.size], ['Cost', mat.cost], ['Supplier', mat.supplier],
    ['Room', mat.rooms?.name ?? null], ['Notes', mat.notes],
  ]

  return (
    <main className="max-w-3xl space-y-5">
      <div>
        <Link href={`/projects/${mat.project_id}/materials`} className="text-sm text-gray-500">← materials</Link>
        <h1 className="text-xl font-semibold">{mat.name}</h1>
        <div className="text-xs text-gray-500">{categoryLabel(mat.category)}</div>
      </div>

      <MaterialStatusControl id={mat.id} status={mat.status} />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {fields.filter(([, v]) => v !== null && v !== '').map(([k, v]) => (
          <div key={k} className="flex justify-between border-b py-1">
            <dt className="text-gray-500">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-2">
        <h4 className="text-sm font-medium">Photos &amp; datasheets</h4>
        <MaterialAttachments attachments={attachments} />
        <AddMaterialAttachment materialId={mat.id} projectId={mat.project_id} />
      </section>
    </main>
  )
}
