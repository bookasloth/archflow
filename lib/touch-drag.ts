// HTML5 drag-and-drop never fires on touch screens, so on phones the Kanban was tap-only.
// Long-press a card (250ms without moving) to pick it up, slide over a column, lift to drop.
// Moving before the long-press fires is a normal scroll. Columns carry data-drop-status;
// the board's scroller (kanbanScrollerRef) auto-scrolls near its edges.
let suppressClickUntil = 0
let carrying = false
// A long-press that ends on the same card would also fire a click — don't open the drawer.
export const clickSuppressed = () => Date.now() < suppressClickUntil

// Chrome only lets a touch be stopped from scrolling if a blocking listener already existed
// when the touch began — so the board's scroller registers one up front (ref callback).
export function kanbanScrollerRef(el: HTMLElement | null) {
  if (!el || el.dataset.touchDragReady) return
  el.dataset.touchDragReady = '1'
  el.addEventListener('touchmove', (e) => {
    if (carrying && e.cancelable) e.preventDefault()
  }, { passive: false })
}

export function touchDrag<T>(
  item: T,
  { onStart, onEnd }: { onStart: (item: T) => void; onEnd: (item: T, dropStatus: string | null) => void },
) {
  return {
    onContextMenu: (e: React.MouseEvent) => {
      if ((e.nativeEvent as PointerEvent).pointerType === 'touch') e.preventDefault()
    },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'touch') return
      const x0 = e.clientX
      const y0 = e.clientY
      let x = x0
      let y = y0
      let active = false
      const scroller = e.currentTarget.closest<HTMLElement>('[data-touch-drag-ready]')

      const timer = setTimeout(() => {
        active = true
        carrying = true
        navigator.vibrate?.(10)
        onStart(item)
      }, 250)

      const move = (ev: PointerEvent) => {
        x = ev.clientX
        y = ev.clientY
        if (!active) {
          if (Math.hypot(x - x0, y - y0) > 8) cleanup() // it's a scroll, not a pick-up
          return
        }
        if (scroller) {
          const r = scroller.getBoundingClientRect()
          if (x < r.left + 40) scroller.scrollLeft -= 16
          else if (x > r.right - 40) scroller.scrollLeft += 16
        }
      }
      const up = () => {
        const wasActive = active
        const col = wasActive
          ? document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-status]')
          : null
        cleanup()
        if (wasActive) {
          suppressClickUntil = Date.now() + 400
          onEnd(item, col?.dataset.dropStatus ?? null)
        }
      }
      function cleanup() {
        clearTimeout(timer)
        carrying = false
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    },
  }
}
