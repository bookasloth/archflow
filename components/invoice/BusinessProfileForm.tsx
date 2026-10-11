'use client'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveBusinessProfile, type Result } from '@/app/(app)/invoice-actions'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { ImageField, Labeled, Textarea, FormMessage } from '@/components/invoice/fields'
import { INDIAN_STATES } from '@/lib/invoice/rules'
import { percentString } from '@/lib/invoice/money'

type Profile = Record<string, unknown> | null

const v = (p: Profile, k: string, d = '') => (p?.[k] == null ? d : String(p[k]))

function Save() {
  const { pending } = useFormStatus()
  return <Button variant="primary" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Button>
}

export function BusinessProfileForm({ profile, nextNumber }: { profile: Profile; nextNumber: string }) {
  const [result, setResult] = useState<Result | null>(null)
  const [gst, setGst] = useState(Boolean(profile?.gst_registered))
  const fe = result && !result.ok ? result.fieldErrors ?? {} : {}
  const [savedAt, setSavedAt] = useState<string | null>(null)

  return (
    <form
      action={async (fd) => {
        const r = await saveBusinessProfile(fd)
        setResult(r)
        setSavedAt(r.ok ? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null)
      }}
      className="space-y-8"
    >
      <FormMessage result={result} />

      <Section title="Practice">
        <div className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Firm / architect name *" error={fe.firm_name}><Input name="firm_name" defaultValue={v(profile, 'firm_name')} required /></Labeled>
          <Labeled label="Principal architect"><Input name="principal_name" defaultValue={v(profile, 'principal_name')} /></Labeled>
          <Labeled label="Professional registration" hint="e.g. Council of Architecture no."><Input name="registration" defaultValue={v(profile, 'registration')} /></Labeled>
          <Labeled label="Website"><Input name="website" defaultValue={v(profile, 'website')} /></Labeled>
          <Labeled label="Phone"><Input name="phone" type="tel" defaultValue={v(profile, 'phone')} /></Labeled>
          <Labeled label="Email"><Input name="email" type="email" defaultValue={v(profile, 'email')} /></Labeled>
          <Labeled label="Address" className="sm:col-span-2"><Input name="address" defaultValue={v(profile, 'address')} /></Labeled>
          <Labeled label="City"><Input name="city" defaultValue={v(profile, 'city')} /></Labeled>
          <Labeled label="State" hint="Used to decide CGST+SGST vs IGST">
            <select name="state" defaultValue={v(profile, 'state')} className="h-8 rounded border border-subtle bg-surface px-2 text-sm">
              <option value="">—</option>
              {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Labeled>
          <Labeled label="PIN code"><Input name="pin" inputMode="numeric" defaultValue={v(profile, 'pin')} /></Labeled>
          <Labeled label="Country"><Input name="country" defaultValue={v(profile, 'country', 'India')} /></Labeled>
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <ImageField name="logo_data" label="Logo" initial={(profile?.logo_data as string) ?? null} />
          <ImageField name="signature_data" label="Signature (optional)" initial={(profile?.signature_data as string) ?? null} />
        </div>
      </Section>

      <Section title="Tax & payment">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="gst_registered" checked={gst} onChange={(e) => setGst(e.target.checked)} />
          GST-registered (issue tax invoices)
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {gst && <Labeled label="GSTIN *" error={fe.gstin}><Input name="gstin" defaultValue={v(profile, 'gstin')} className="uppercase" /></Labeled>}
          <Labeled label="PAN" error={fe.pan}><Input name="pan" defaultValue={v(profile, 'pan')} className="uppercase" /></Labeled>
          <Labeled label="Default GST rate (%)" error={fe.default_tax_rate} hint="Per line you can still pick 0/5/12/18/28 or any rate">
            <Input name="default_tax_rate" inputMode="decimal" defaultValue={profile ? percentString(Number(profile.default_tax_rate)) : '18'} />
          </Labeled>
          <Labeled label="Default pricing">
            <select name="default_tax_mode" defaultValue={v(profile, 'default_tax_mode', 'exclusive')} className="h-8 rounded border border-subtle bg-surface px-2 text-sm">
              <option value="exclusive">Rates exclude GST</option>
              <option value="inclusive">Rates include GST</option>
            </select>
          </Labeled>
          <Labeled label="Bank details" className="sm:col-span-2" hint="Bank, account no., IFSC, branch"><Textarea name="bank_details" defaultValue={v(profile, 'bank_details')} /></Labeled>
          <Labeled label="UPI ID"><Input name="upi_id" defaultValue={v(profile, 'upi_id')} placeholder="studio@bank" /></Labeled>
          <Labeled label="Default due in (days)" error={fe.default_due_days}><Input name="default_due_days" type="number" min={0} max={365} defaultValue={v(profile, 'default_due_days', '15')} /></Labeled>
          <Labeled label="Default terms" className="sm:col-span-2"><Textarea name="default_terms" defaultValue={v(profile, 'default_terms')} /></Labeled>
          <Labeled label="Default notes" className="sm:col-span-2"><Textarea name="default_notes" defaultValue={v(profile, 'default_notes')} /></Labeled>
        </div>
      </Section>

      <Section title="Numbering & look">
        <div className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Invoice prefix" error={fe.invoice_prefix} hint={`Next issued number: ${nextNumber}`}><Input name="invoice_prefix" defaultValue={v(profile, 'invoice_prefix', 'INV')} /></Labeled>
          <Labeled label="Proforma prefix" error={fe.proforma_prefix}><Input name="proforma_prefix" defaultValue={v(profile, 'proforma_prefix', 'PI')} /></Labeled>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="number_by_fy" defaultChecked={profile ? Boolean(profile.number_by_fy) : true} />
            Restart numbering each financial year (INV/2026-27/0001)
          </label>
          <Labeled label="Default template">
            <select name="template" defaultValue={v(profile, 'template', 'minimal')} className="h-8 rounded border border-subtle bg-surface px-2 text-sm">
              <option value="minimal">Minimal Studio</option>
              <option value="editorial">Editorial Architecture</option>
              <option value="modern">Modern Professional</option>
            </select>
          </Labeled>
          <Labeled label="Accent colour" error={fe.accent_color} hint="Used sparingly by Modern Professional">
            <input type="color" name="accent_color" defaultValue={v(profile, 'accent_color', '#FE5000')} className="h-8 w-16 rounded border border-subtle bg-surface" />
          </Labeled>
          <Labeled label="Footer note" className="sm:col-span-2"><Input name="footer_note" defaultValue={v(profile, 'footer_note')} placeholder="Thank you for your business." /></Labeled>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <Save />
        {result?.ok && savedAt && <span className="text-sm text-success" role="status">Saved at {savedAt}</span>}
      </div>
    </form>
  )
}
