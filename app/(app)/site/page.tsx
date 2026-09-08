import { createClient } from '@/lib/supabase/server'
import { SiteCapture } from '@/components/SiteCapture'

export default async function SitePage() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from('projects').select('id, name').order('name')
  return <SiteCapture projects={projects ?? []} />
}
