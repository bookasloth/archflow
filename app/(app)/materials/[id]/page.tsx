import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signedMaterialUrl } from '@/app/(app)/material-actions'
import { categoryLabel, type MaterialStatus } from '@/lib/materials'
import { MaterialStatusControl } from '@/components/MaterialStatusControl'
import { MaterialAttachments } from '@/components/MaterialAttachments'
import { AddMaterialAttachment } from '@/components/AddMaterialAttachment'
import { TicketDrawer } from '@/components/TicketDrawer'

type MaterialRow = {
  id: string; project_id: string; category: string; name: string; manufacturer: string | null
  product_code: string | null; finish: string | null; color: string | null; size: string | null
  cost: number | null; supplier: string | null; notes: string | null; status: MaterialStatus
  rooms: { name: string } | null
  decided_at: string | null
  decider: { full_name: string | null } | null
  drawing_id: string | null
  drawing: { drawing_number: string | null; title: string } | null
}
type AttRow = { id: string; storage_path: string; kind: string }
type LinkedTicket = { id: string; seq: number; type: string; title: string }

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: m } = await supabase
    .from('materials')
    .select('id, project_id, category, name, manufacturer, product_code, finish, color, size, cost, supplier, notes, status, rooms(name), decided_at, decided_by, decider:profiles!decided_by(full_name), drawing_id, drawing:drawing_id(drawing_number, title)')
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
      id: a.id, kind: a.kind, path: a.storage_path,
      url: await signedMaterialUrl(a.storage_path),
    })),
  )

  const { data: ticketRows } = await supabase
    .from('tickets')
    .select('id, seq, type, title')
    .eq('material_id', id)
    .order('seq', { ascending: false })
  const linkedTickets = (ticketRows as LinkedTicket[]) ?? []

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
        {mat.drawing_id && (
          <Link
            href={`/drawings/${mat.drawing_id}`}
            className="mt-1 inline-block text-xs text-primary hover:underline"
          >
            {mat.drawing?.drawing_number ? `${mat.drawing.drawing_number} — linked drawing` : 'Linked drawing'} →
          </Link>
        )}
      </div>

      <MaterialStatusControl id={mat.id} status={mat.status} />

      {mat.status !== 'proposed' && mat.decided_at && (
        <p className="text-xs text-gray-500">
          {mat.status} by {mat.decider?.full_name ?? 'someone'} on {mat.decided_at.slice(0, 10)}
        </p>
      )}

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

      <section className="space-y-2">
        <h4 className="text-sm font-medium">Linked tickets · {linkedTickets.length}</h4>
        {linkedTickets.length === 0 ? (
          <p className="text-sm text-gray-400">None.</p>
        ) : (
          <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface text-sm">
            {linkedTickets.map((t) => (
              <li key={t.id} className="hover:bg-surface-hover">
                <Link href={`/materials/${mat.id}?ticket=${t.id}`} className="flex items-center gap-2 p-2.5">
                  <span className="font-mono text-xs text-ink-faint">
                    {(t.type === 'site_issue' ? 'SITE-' : 'TASK-') + t.seq}
                  </span>
                  <span className="truncate text-ink">{t.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TicketDrawer />
    </main>
  )
}
