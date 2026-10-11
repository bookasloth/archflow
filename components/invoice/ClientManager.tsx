'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteClient } from '@/app/(app)/invoice-actions'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ClientForm, type ClientRow } from '@/components/invoice/ClientForm'

export function ClientManager({ clients, q }: { clients: ClientRow[]; q: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState<ClientRow | null | 'new'>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function remove(c: ClientRow) {
    if (!confirm(`Delete ${c.name}? This can't be undone.`)) return
    setError(null)
    start(async () => {
      const r = await deleteClient(c.id)
      if (!r.ok) setError(r.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex-1" role="search">
          <input name="q" defaultValue={q} placeholder="Search clients by name, contact, email or phone"
            className="h-9 w-full max-w-md rounded border border-subtle bg-surface px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
        </form>
        <Button variant="primary" onClick={() => setEditing('new')}>＋ New client</Button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {clients.length === 0 ? (
        <EmptyState title={q ? 'No clients match' : 'No clients yet'} description="Clients you add here can be reused on every invoice." />
      ) : (
        <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
          {clients.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium text-ink">{c.name}</div>
                <div className="truncate text-xs text-ink-muted">
                  {[c.contact_person, c.phone, c.email, c.state, c.gstin && `GSTIN ${c.gstin}`].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(c)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Drawer label={editing === 'new' ? 'New client' : 'Edit client'} onClose={() => setEditing(null)}>
          <ClientForm
            client={editing === 'new' ? null : editing}
            onSaved={() => {
              setEditing(null)
              router.refresh()
            }}
          />
        </Drawer>
      )}
    </div>
  )
}
