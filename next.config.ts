import type { NextConfig } from 'next'

const SUPABASE_PROXY_PATH = '/sb' // keep in sync with lib/supabase/proxy.ts

const nextConfig: NextConfig = {
  experimental: {
    // Client-side Router Cache: reuse a page's rendered payload on repeat nav
    // instead of refetching. Dynamic pages default to 0s in Next 15, so hopping
    // Home ↔ Project ↔ My Work refetched every time. 30s = instant returns for
    // an operator moving around; server actions call revalidatePath on mutations,
    // so writes still bust the cache.
    // ponytail: 30s staleness ceiling — lower it if a page must always be live.
    staleTimes: { dynamic: 30, static: 180 },
  },
  // Same-origin proxy to Supabase (see lib/supabase/proxy.ts). On Vercel this is an
  // edge-level rewrite, not a function, so uploads aren't capped by function limits.
  async rewrites() {
    return [
      { source: `${SUPABASE_PROXY_PATH}/:path*`, destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/:path*` },
    ]
  },
  async headers() {
    // Auth + REST responses are per-user: never let the CDN cache proxied responses.
    return [
      { source: `${SUPABASE_PROXY_PATH}/:path*`, headers: [{ key: 'x-vercel-enable-rewrite-caching', value: '0' }] },
    ]
  },
}

export default nextConfig
