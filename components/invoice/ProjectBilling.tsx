'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { saveProjectBilling, type Result } from '@/app/(app)/invoice-actions'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Labeled, Textarea, FormMessage } from '@/components/invoice/fields'
import { INDIAN_STATES, PROJECT_TYPES } from '@/lib/invoice/rules'
import { formatINR, rupeesString } from '@/lib/invoice/money'

export type ProjectWithBilling = {
  id: string; name: string; code: string | null
  billing: {
    client_id: string | null; reference: string | null; project_type: string | null; location: string | null
    site_state: string | null; description: string | null; contract_value: number | null; agreed_fee: number | null
    billing_method: string | null; start_date: string | null; end_date: string | null; notes: string | null
  } | null
}

const METHODS = ['Lump sum', 'Percentage of project cost', 'Stage-wise', 'Per sq. ft.', 'Hourly / time-based', 'Other']
const typeLabel = (t: string) => t.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())

function Save() {
  const { pending } = useFormStatus()
  return <Button variant="primary" disabled={pending}>{pending ? 'Saving…' : 'Save project'}</Button>
}

function ProjectForm({ project, clients, onSaved }: { project: ProjectWithBilling | null; clients: { id: string; name: string }[]; onSaved: () => void }) {
  const [result, setResult] = useState<Result<{ projectId: string }> | null>(null)
  const fe = result && !result.ok ? result.fieldErrors ?? {} : {}
  const b = project?.billing
  return (
    <form action={async (fd) => { const r = await saveProjectBilling(fd); setResult(r); if (r.ok) onSaved() }} className="space-y-3">
      <h2 className="text-lg font-semibold">{project ? project.name : 'New project'}</h2>
      <FormMessage result={result} />
      {project ? <input type="hidden" name="project_id" value={project.id} /> : (
        <div className="grid grid-cols-2 gap-3">
          <Labeled label="Project name *" error={fe.name}><Input name="name" required autoFocus /></Labeled>
          <Labeled label="Code"><Input name="code" /></Labeled>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Client">
          <select name="client_id" defaultValue={b?.client_id ?? ''} className="h-8 rounded border border-subtle bg-surface px-2 text-sm">
            <option value="">—</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Labeled>
        <Labeled label="Reference no."><Input name="reference" defaultValue={b?.reference ?? ''} /></Labeled>
        <Labeled label="Type">
          <select name="project_type" defaultValue={b?.project_type ?? ''} className="h-8 rounded border border-subtle bg-surface px-2 text-sm">
            <option value="">—</option>
            {PROJECT_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </select>
        </Labeled>
        <Labeled label="Location"><Input name="location" defaultValue={b?.location ?? ''} /></Labeled>
        <Labeled label="Site state" hint="Default place of supply for this project">
          <select name="site_state" defaultValue={b?.site_state ?? ''} className="h-8 rounded border border-subtle bg-surface px-2 text-sm">
            <option value="">—</option>
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Labeled>
        <Labeled label="Billing method">
          <select name="billing_method" defaultValue={b?.billing_method ?? ''} className="h-8 rounded border border-subtle bg-surface px-2 text-sm">
            <option value="">—</option>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Labeled>
        <Labeled label="Contract value (₹)" error={fe.contract_value}><Input name="contract_value" inputMode="decimal" defaultValue={b?.contract_value != null ? rupeesString(b.contract_value) : ''} /></Labeled>
        <Labeled label="Agreed fee (₹)" error={fe.agreed_fee}><Input name="agreed_fee" inputMode="decimal" defaultValue={b?.agreed_fee != null ? rupeesString(b.agreed_fee) : ''} /></Labeled>
        <Labeled label="Start date"><Input name="start_date" type="date" defaultValue={b?.start_date ?? ''} /></Labeled>
        <Labeled label="Expected completion" error={fe.end_date}><Input name="end_date" type="date" defaultValue={b?.end_date ?? ''} /></Labeled>
      </div>
      <Labeled label="Description"><Textarea name="description" defaultValue={b?.description ?? ''} /></Labeled>
      <Labeled label="Notes"><Textarea name="notes" defaultValue={b?.notes ?? ''} /></Labeled>
      <Save />
    </form>
  )
}

export function ProjectBilling({ projects, clients }: { projects: ProjectWithBilling[]; clients: { id: string; name: string }[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<ProjectWithBilling | 'new' | null>(null)
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button variant="primary" onClick={() => setEditing('new')}>＋ New project</Button></div>
      {projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Projects are shared with the rest of Archflow; billing details stay admin-only." />
      ) : (
        <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
          {projects.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium text-ink">{p.name}{p.code && <span className="ml-2 font-mono text-xs text-ink-faint">{p.code}</span>}</div>
                <div className="truncate text-xs text-ink-muted">
                  {[clientName(p.billing?.client_id ?? null), p.billing?.project_type && typeLabel(p.billing.project_type), p.billing?.location,
                    p.billing?.agreed_fee != null && `Fee ${formatINR(p.billing.agreed_fee)}`].filter(Boolean).join(' · ') || 'No billing details yet'}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>{p.billing ? 'Edit billing' : 'Add billing'}</Button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <Drawer label="Project billing" onClose={() => setEditing(null)}>
          <ProjectForm project={editing === 'new' ? null : editing} clients={clients} onSaved={() => { setEditing(null); router.refresh() }} />
        </Drawer>
      )}
    </div>
  )
}
