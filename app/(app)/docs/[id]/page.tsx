import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { isAdmin } from '@/lib/permissions'
import { parseBlocks } from '@/lib/blocks'
import { DocEditor } from '@/components/DocEditor'
import { TrackView } from '@/components/TrackView'

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { role } = await getCurrentUserWithRole()

  const { data: doc } = await supabase
    .from('documents').select('id, project_id, title, content').eq('id', id).single()
  if (!doc) notFound()
  const d = doc as { id: string; project_id: string | null; title: string; content: unknown }

  return (
    <main>
      <TrackView entityType="document" entityId={d.id} />
      <DocEditor
        id={d.id}
        initialTitle={d.title}
        initialContent={parseBlocks(d.content)}
        projectId={d.project_id}
        canDelete={isAdmin(role)}
      />
    </main>
  )
}
