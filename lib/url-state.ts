// Shallow URL update for client-only state (open drawer, sort/group, board tab, month).
// Next 15 syncs useSearchParams with the native History API, so this re-renders
// instantly with NO server round trip. router.replace re-ran the whole page's
// queries just to open a drawer — that was the "click and nothing happens" lag.
// Only use for params the server page does not read.
export function setSearchParams(updates: Record<string, string | null>) {
  const p = new URLSearchParams(window.location.search)
  for (const [k, v] of Object.entries(updates)) {
    if (v) p.set(k, v)
    else p.delete(k)
  }
  const qs = p.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
}
