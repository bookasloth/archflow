import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { BusinessProfileForm } from '@/components/invoice/BusinessProfileForm'
import { financialYear, formatInvoiceNumber, todayIST } from '@/lib/invoice/rules'

export default async function InvoiceSettingsPage() {
  const supabase = await createClient()
  const { data: profile } = await supabase.from('business_profile').select('*').maybeSingle()
  const prefix = profile?.invoice_prefix ?? 'INV'
  const fy = (profile?.number_by_fy ?? true) ? financialYear(todayIST()) : ''
  const { data: seq } = await supabase.from('invoice_sequences').select('next_no').eq('prefix', prefix).eq('fy', fy).maybeSingle()
  return (
    <main>
      <PageHeader title="Billing settings" meta={<span>Your practice details fill every new invoice automatically.</span>} />
      <BusinessProfileForm profile={profile as Record<string, unknown> | null} nextNumber={formatInvoiceNumber(prefix, fy || null, seq?.next_no ?? 1)} />
    </main>
  )
}
