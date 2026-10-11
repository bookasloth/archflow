// Client-side store behind the side drawers: dedupes in-flight loads, remembers the last
// result (reopen paints instantly) and lets cards prefetch on hover. Uses fetch() to a GET
// route on purpose — Next runs server actions one at a time, so a drawer load done as an
// action would wait behind a status change or comment.
export function detailStore<T>(endpoint: (id: string) => string) {
  const cache = new Map<string, T>()
  const inflight = new Map<string, Promise<T | null>>()

  // fresh: skip an in-flight request that may have started before a mutation.
  function load(id: string, fresh = false): Promise<T | null> {
    const pending = inflight.get(id)
    if (pending && !fresh) return pending
    const p = fetch(endpoint(id), { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<T | null>) : null))
      .then((d) => {
        if (d) cache.set(id, d)
        return d
      })
      .finally(() => {
        if (inflight.get(id) === p) inflight.delete(id)
      })
    inflight.set(id, p)
    return p
  }

  return {
    load,
    cached: (id: string) => cache.get(id),
    prefetch: (id: string) => {
      if (!cache.has(id)) load(id).catch(() => {})
    },
  }
}

// Mouse hover that lingers 120ms starts loading the drawer's data, so it's usually
// already there on click. Touch is skipped (no hover). One shared timer: one pointer.
let hoverTimer: ReturnType<typeof setTimeout> | undefined
export function prefetchOnHover(run: () => void) {
  return {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      clearTimeout(hoverTimer)
      hoverTimer = setTimeout(run, 120)
    },
    onPointerLeave: () => clearTimeout(hoverTimer),
  }
}

// Signed photo URLs carry a fresh token every time they're minted, so the browser could
// never reuse a photo it already downloaded. Keep the first URL per storage path for
// 50 min (they're valid 60) so repeat views hit the HTTP cache instead of re-downloading.
const urls = new Map<string, { url: string; until: number }>()
export function stableUrl(path: string, url: string): string {
  const hit = urls.get(path)
  if (hit && hit.until > Date.now()) return hit.url
  if (url) urls.set(path, { url, until: Date.now() + 50 * 60_000 })
  return url
}
