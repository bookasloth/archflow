'use client'
import { useEffect, useRef, useState } from 'react'
import { updateDocument, deleteDocument } from '@/app/(app)/doc-actions'
import type { Block, BlockType } from '@/lib/blocks'

const ADD: { type: BlockType; label: string }[] = [
  { type: 'paragraph', label: 'Text' },
  { type: 'heading', label: 'Heading' },
  { type: 'todo', label: 'To-do' },
  { type: 'bullet', label: 'Bullet' },
  { type: 'callout', label: 'Callout' },
]

export function DocEditor({ id, initialTitle, initialContent, projectId, canDelete }: {
  id: string; initialTitle: string; initialContent: Block[]; projectId: string | null; canDelete: boolean
}) {
  const [title, setTitle] = useState(initialTitle)
  const [blocks, setBlocks] = useState<Block[]>(initialContent.length ? initialContent : [{ type: 'paragraph', text: '' }])
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const first = useRef(true)

  // Debounced autosave.
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setStatus('saving')
    const h = setTimeout(async () => { await updateDocument(id, title, blocks); setStatus('saved') }, 600)
    return () => clearTimeout(h)
  }, [id, title, blocks])

  const patch = (i: number, p: Partial<Block>) => setBlocks((b) => b.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const add = (type: BlockType) => setBlocks((b) => [...b, { type, text: '', ...(type === 'heading' ? { level: 2 as const } : {}) }])
  const remove = (i: number) => setBlocks((b) => b.filter((_, j) => j !== i))

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full bg-transparent font-heading text-2xl font-semibold text-ink outline-none placeholder:text-ink-faint"
        />
        <span className="ml-3 shrink-0 text-xs text-ink-faint">{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}</span>
      </div>

      <div className="space-y-1">
        {blocks.map((b, i) => (
          <div key={i} className="group flex items-start gap-1.5">
            {b.type === 'todo' && (
              <input type="checkbox" checked={b.checked ?? false} onChange={(e) => patch(i, { checked: e.target.checked })} className="mt-1.5 accent-[var(--primary)]" />
            )}
            {b.type === 'bullet' && <span className="mt-1.5 text-ink-faint">•</span>}
            <textarea
              value={b.text}
              onChange={(e) => patch(i, { text: e.target.value })}
              rows={1}
              placeholder={b.type === 'heading' ? 'Heading' : 'Type…'}
              className={`w-full resize-none bg-transparent outline-none ${
                b.type === 'heading' ? 'font-heading text-lg font-semibold text-ink' :
                b.type === 'callout' ? 'rounded-lg border border-subtle bg-primary-soft px-3 py-2 text-sm text-ink' :
                'text-sm text-ink'
              } ${b.type === 'todo' && b.checked ? 'text-ink-faint line-through' : ''}`}
            />
            <button aria-label="Delete block" onClick={() => remove(i)}
              className="mt-1 shrink-0 text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100">×</button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-t border-subtle pt-3 text-xs">
        <span className="text-ink-faint">Add:</span>
        {ADD.map((a) => (
          <button key={a.type} onClick={() => add(a.type)}
            className="rounded border border-subtle px-2 py-0.5 text-ink-muted hover:bg-surface-hover hover:text-ink">
            {a.label}
          </button>
        ))}
        {canDelete && (
          <button onClick={() => deleteDocument(id, projectId)}
            className="ml-auto rounded px-2 py-0.5 text-danger hover:bg-danger-soft">Delete page</button>
        )}
      </div>
    </div>
  )
}
