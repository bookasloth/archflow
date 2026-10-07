// One board column for both ticket and drawing Kanbans. state drives drag feedback:
// target = legal drop (highlighted), blocked = not allowed for the dragged card (dimmed).
export function KanbanColumn({
  label,
  count,
  dotClass,
  state,
  onDragOver,
  onDrop,
  children,
}: {
  label: string
  count: number
  dotClass: string
  state: 'idle' | 'target' | 'blocked'
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  children: React.ReactNode
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex min-h-[8rem] w-64 shrink-0 flex-col gap-2 rounded-lg border p-2 transition-colors ${
        state === 'target'
          ? 'border-primary bg-primary-soft'
          : state === 'blocked'
            ? 'border-subtle bg-surface-hover opacity-50'
            : 'border-subtle bg-surface-hover'
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
        <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
        <span>{label}</span>
        <span className="text-ink-faint">· {count}</span>
      </div>
      {children}
    </div>
  )
}
