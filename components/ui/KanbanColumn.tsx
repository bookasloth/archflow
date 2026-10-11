// One board column for both ticket and drawing Kanbans. state drives drag feedback:
// target = legal drop (highlighted), blocked = not allowed for the dragged card (dimmed).
// collapsed = a narrow strip (empty side stage, or Superseded history): still a drop
// target, and onToggle expands/collapses it.
export function KanbanColumn({
  label,
  count,
  dotClass,
  state,
  dropStatus,
  collapsed = false,
  onToggle,
  onDragOver,
  onDrop,
  children,
}: {
  label: string
  count: number
  dotClass: string
  state: 'idle' | 'target' | 'blocked'
  dropStatus?: string // touch drag finds the column under the finger by this
  collapsed?: boolean
  onToggle?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  children?: React.ReactNode
}) {
  const tone =
    state === 'target'
      ? 'border-primary bg-primary-soft'
      : state === 'blocked'
        ? 'border-subtle bg-surface-hover opacity-50'
        : 'border-subtle bg-surface-hover'

  if (collapsed) {
    return (
      <div data-drop-status={dropStatus} onDragOver={onDragOver} onDrop={onDrop} className="shrink-0">
        {/* div, not a disabled button: Chrome drops drag events on disabled controls. */}
        <div
          {...(onToggle && {
            role: 'button',
            tabIndex: 0,
            onClick: onToggle,
            onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle()),
          })}
          title={onToggle ? `Show ${label}` : label}
          aria-label={`${label}, ${count}${onToggle ? ' — show' : ''}`}
          className={`flex h-full min-h-[8rem] w-11 flex-col items-center gap-2 rounded-lg border py-2 text-xs font-medium text-ink-muted transition-colors ${tone} ${
            onToggle ? 'cursor-pointer hover:text-ink' : ''
          }`}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
          <span className="text-ink-faint">{count}</span>
          <span className="[writing-mode:vertical-rl]">{label}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      data-drop-status={dropStatus}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex min-h-[8rem] w-64 shrink-0 flex-col gap-2 rounded-lg border p-2 transition-colors ${tone}`}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
        <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
        <span>{label}</span>
        <span className="text-ink-faint">· {count}</span>
        {onToggle && (
          <button type="button" onClick={onToggle} className="ml-auto text-ink-faint hover:text-ink">
            Hide
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
