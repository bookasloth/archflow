import { describe, it, expect, beforeAll } from 'vitest'

let proxy: typeof import('@/lib/supabase/proxy')

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcref.supabase.co'
  proxy = await import('@/lib/supabase/proxy')
})

describe('supabase proxy', () => {
  it('pins the auth cookie to the real project ref (server + browser must match)', () => {
    expect(proxy.AUTH_COOKIE_NAME).toBe('sb-abcref-auth-token')
  })
  it('rewrites signed storage URLs onto our own domain', () => {
    expect(proxy.viaProxy('https://abcref.supabase.co/storage/v1/object/sign/b/x.jpg?token=t')).toBe(
      '/sb/storage/v1/object/sign/b/x.jpg?token=t',
    )
  })
  it('leaves empty / foreign URLs alone', () => {
    expect(proxy.viaProxy('')).toBe('')
    expect(proxy.viaProxy('https://other.example/x')).toBe('https://other.example/x')
  })
})
