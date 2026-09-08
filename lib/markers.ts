export interface Norm { x: number; y: number }
export interface Rect { left: number; top: number; width: number; height: number }

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export function toNormalized(clientX: number, clientY: number, rect: Rect): Norm {
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  }
}

export function toPixels(n: Norm, rect: Rect): { left: number; top: number } {
  return { left: rect.left + n.x * rect.width, top: rect.top + n.y * rect.height }
}
