import { describe, it, expect, vi } from 'vitest'
import { detailStore, stableUrl } from '@/lib/detail-store'
import { compressImage } from '@/lib/compress-image'

describe('detailStore', () => {
  it('dedupes concurrent loads, caches, and fresh bypasses the in-flight request', async () => {
    let n = 0
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ v: ++n }) })))
    const s = detailStore<{ v: number }>((id) => `/api/x/${id}`)

    const [a, b] = await Promise.all([s.load('1'), s.load('1')]) // hover prefetch + click
    expect(a).toEqual({ v: 1 })
    expect(b).toBe(a)
    expect(s.cached('1')).toEqual({ v: 1 })

    expect(await s.load('1', true)).toEqual({ v: 2 }) // after a mutation
    expect(fetch).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })
})

describe('stableUrl', () => {
  it('keeps the first signed URL per path so the browser cache can hit', () => {
    expect(stableUrl('p/a.jpg', '/sb/a?token=1')).toBe('/sb/a?token=1')
    expect(stableUrl('p/a.jpg', '/sb/a?token=2')).toBe('/sb/a?token=1')
  })
})

describe('compressImage', () => {
  it('passes non-photos (PDF datasheets) through untouched', async () => {
    const pdf = new File(['%PDF'], 'spec.pdf', { type: 'application/pdf' })
    expect(await compressImage(pdf)).toBe(pdf)
  })
})
