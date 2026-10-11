'use client'
import { useOptimistic, useRef } from 'react'
import { addComment } from '@/app/(app)/actions'

type C = { id: string; body: string; created_at: string; author: string | null; pending?: boolean }

export function CommentThread({
  ticketId,
  comments,
  onPosted,
}: {
  ticketId: string
  comments: C[]
  onPosted?: () => void | Promise<void>
}) {
  // A posted comment shows immediately (faded until saved) instead of after the round trip.
  const [shown, addPending] = useOptimistic(comments, (list: C[], c: C) => [...list, c])
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <section className="space-y-2">
      <h4 className="text-sm font-medium">Comments</h4>
      <ul className="space-y-1 text-sm">
        {shown.map((c) => (
          <li key={c.id} className={c.pending ? 'opacity-60' : ''}>
            <span className="text-ink-muted">{c.author ?? 'someone'}:</span> {c.body}
          </li>
        ))}
      </ul>
      <form
        ref={formRef}
        action={async (fd) => {
          const body = String(fd.get('body') ?? '').trim()
          if (!body) return
          addPending({ id: `pending-${Date.now()}`, body, created_at: new Date().toISOString(), author: 'You', pending: true })
          formRef.current?.reset()
          await addComment(fd)
          await onPosted?.()
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="ticket_id" value={ticketId} />
        <input name="body" placeholder="Add a comment" className="flex-1 rounded border p-1 text-sm" />
        <button className="rounded bg-primary px-3 hover:bg-primary-hover text-sm text-white">Post</button>
      </form>
    </section>
  )
}
