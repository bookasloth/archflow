import { addComment } from '@/app/(app)/actions'

type C = { id: string; body: string; created_at: string; author: string | null }

export function CommentThread({ ticketId, comments }: { ticketId: string; comments: C[] }) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-medium">Comments</h4>
      <ul className="space-y-1 text-sm">
        {comments.map((c) => (
          <li key={c.id}>
            <span className="text-ink-muted">{c.author ?? 'someone'}:</span> {c.body}
          </li>
        ))}
      </ul>
      <form action={addComment} className="flex gap-2">
        <input type="hidden" name="ticket_id" value={ticketId} />
        <input name="body" placeholder="Add a comment" className="flex-1 rounded border p-1 text-sm" />
        <button className="rounded bg-primary px-3 hover:bg-primary-hover text-sm text-white">Post</button>
      </form>
    </section>
  )
}
