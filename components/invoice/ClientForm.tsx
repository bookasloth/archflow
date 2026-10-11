'use client'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveClient, type Result } from '@/app/(app)/invoice-actions'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Labeled, Textarea, FormMessage } from '@/components/invoice/fields'
import { INDIAN_STATES } from '@/lib/invoice/rules'

export type ClientRow = {
  id: string; name: string; contact_person: string | null; billing_address: string | null; site_address: string | null
  state: string | null; pin: string | null; email: string | null; phone: string | null; gstin: string | null; notes: string | null
}

function Save() {
  const { pending } = useFormStatus()
  return <Button variant="primary" disabled={pending}>{pending ? 'Saving…' : 'Save client'}</Button>
}

// Used on the Clients tab and inline from the invoice editor ("+ New client").
export function ClientForm({ client, onSaved }: { client?: ClientRow | null; onSaved: (id: string) => void }) {
  const [result, setResult] = useState<Result<{ id: string }> | null>(null)
  const fe = result && !result.ok ? result.fieldErrors ?? {} : {}
  const c = client
  return (
    <form
      action={async (fd) => {
        const r = await saveClient(fd)
        setResult(r)
        if (r.ok) onSaved(r.id)
      }}
      className="space-y-3"
    >
      <h2 className="text-lg font-semibold">{c ? 'Edit client' : 'New client'}</h2>
      <FormMessage result={result} />
      {c && <input type="hidden" name="id" value={c.id} />}
      <Labeled label="Client / company name *" error={fe.name}><Input name="name" defaultValue={c?.name ?? ''} required autoFocus /></Labeled>
      <Labeled label="Contact person"><Input name="contact_person" defaultValue={c?.contact_person ?? ''} /></Labeled>
      <Labeled label="Billing address"><Textarea name="billing_address" defaultValue={c?.billing_address ?? ''} /></Labeled>
      <Labeled label="Project site address"><Textarea name="site_address" defaultValue={c?.site_address ?? ''} /></Labeled>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="State">
          <select name="state" defaultValue={c?.state ?? ''} className="h-8 rounded border border-subtle bg-surface px-2 text-sm">
            <option value="">—</option>
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Labeled>
        <Labeled label="PIN code"><Input name="pin" inputMode="numeric" defaultValue={c?.pin ?? ''} /></Labeled>
        <Labeled label="Email" error={fe.email}><Input name="email" type="email" defaultValue={c?.email ?? ''} /></Labeled>
        <Labeled label="Phone"><Input name="phone" type="tel" defaultValue={c?.phone ?? ''} /></Labeled>
      </div>
      <Labeled label="GSTIN (if registered)" error={fe.gstin}><Input name="gstin" defaultValue={c?.gstin ?? ''} className="uppercase" /></Labeled>
      <Labeled label="Notes"><Textarea name="notes" defaultValue={c?.notes ?? ''} /></Labeled>
      <Save />
    </form>
  )
}
