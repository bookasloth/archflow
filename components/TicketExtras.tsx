'use client'
import { useState, useTransition } from 'react'
import { Popover } from '@/components/ui/Popover'
import { createTicket } from '@/app/(app)/actions'
import { addTicketTag, removeTicketTag, createTag } from '@/app/(app)/workspace-actions'

type Tag = { id: string; name: string; color: string | null }
type Subtask = { id: string; seq: number; type: string; title: string; status: string }

const ref = (type: string, seq: number) => (type === 'site_issue' ? 'SITE-' : 'TASK-') + seq

export function TicketExtras({
  ticketId, projectId, discipline, parentId, parent, tags, allTags, subtasks, onChanged, onOpenTicket,
}: {
  ticketId: string; projectId: string; discipline: string
  parentId: string | null; parent: { seq: number; type: string; title: string } | null
  tags: Tag[]; allTags: Tag[]; subtasks: Subtask[]
  onChanged: () => void; onOpenTicket: (id: string) => void
}) {
  const [, start] = useTransition()
  const [newSub, setNewSub] = useState('')
  const [newTag, setNewTag] = useState('')
  const applied = new Set(tags.map((t) => t.id))
  const available = allTags.filter((t) => !applied.has(t.id))

  function addTag(id: string) { start(async () => { await addTicketTag(ticketId, id); onChanged() }) }
  function removeTag(id: string) { start(async () => { await removeTicketTag(ticketId, id); onChanged() }) }
  function makeTag() {
    const n = newTag.trim(); if (!n) return
    start(async () => { const id = await createTag(n); if (id) await addTicketTag(ticketId, id); setNewTag(''); onChanged() })
  }
  function addSub() {
    const title = newSub.trim(); if (!title) return
    const fd = new FormData()
    fd.set('project_id', projectId); fd.set('title', title); fd.set('parent_id', ticketId)
    fd.set('discipline', discipline); fd.set('type', 'task'); fd.set('priority', 'medium')
    start(async () => { await createTicket(fd); setNewSub(''); onChanged() })
  }

  return (
    <div className="space-y-3">
      {parentId && parent && (
        <button onClick={() => onOpenTicket(parentId)} className="text-xs text-ink-muted hover:text-primary">
          ↑ Parent · <span className="font-mono">{ref(parent.type, parent.seq)}</span> {parent.title}
        </button>
      )}

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1 rounded bg-surface-hover px-1.5 py-0.5 text-xs text-ink-muted">
            {t.name}
            <button aria-label={`Remove ${t.name}`} onClick={() => removeTag(t.id)} className="hover:text-ink">×</button>
          </span>
        ))}
        <Popover label={<span className="text-xs text-ink-faint">＋ Tag</span>}>
          {(close) => (
            <div className="w-48 space-y-1">
              {available.map((t) => (
                <button key={t.id} onClick={() => { addTag(t.id); close() }}
                  className="block w-full rounded px-2 py-1 text-left text-sm text-ink-muted hover:bg-surface-hover hover:text-ink">
                  {t.name}
                </button>
              ))}
              <div className="flex gap-1 border-t border-subtle pt-1">
                <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag"
                  onKeyDown={(e) => e.key === 'Enter' && (makeTag(), close())}
                  className="h-7 w-full rounded border border-subtle bg-surface px-1.5 text-xs" />
              </div>
            </div>
          )}
        </Popover>
      </div>

      {/* Subtasks */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-ink-muted">Subtasks · {subtasks.length}</div>
        {subtasks.map((s) => (
          <button key={s.id} onClick={() => onOpenTicket(s.id)}
            className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-surface-hover">
            <span className="font-mono text-ink-faint">{ref(s.type, s.seq)}</span>
            <span className="truncate text-ink">{s.title}</span>
            <span className="ml-auto text-ink-faint">{s.status.replace('_', ' ')}</span>
          </button>
        ))}
        <div className="flex gap-1">
          <input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add subtask"
            onKeyDown={(e) => e.key === 'Enter' && addSub()}
            className="h-7 w-full rounded border border-subtle bg-surface px-1.5 text-xs" />
          <button onClick={addSub} className="shrink-0 rounded bg-primary px-2 text-xs text-primary-fg hover:bg-primary-hover">Add</button>
        </div>
      </div>
    </div>
  )
}
