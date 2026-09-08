import { describe, it, expect } from 'vitest'
import { toNormalized, toPixels } from '@/lib/markers'

const rect = { left: 100, top: 50, width: 200, height: 400 }

describe('toNormalized', () => {
  it('maps a click to a fraction of the rect', () => {
    expect(toNormalized(200, 250, rect)).toEqual({ x: 0.5, y: 0.5 })
  })
  it('clamps clicks outside the rect into [0,1]', () => {
    expect(toNormalized(0, 0, rect)).toEqual({ x: 0, y: 0 })
    expect(toNormalized(9999, 9999, rect)).toEqual({ x: 1, y: 1 })
  })
})

describe('toPixels', () => {
  it('is the inverse of toNormalized for in-bounds points', () => {
    expect(toPixels({ x: 0.5, y: 0.5 }, rect)).toEqual({ left: 200, top: 250 })
  })
})
