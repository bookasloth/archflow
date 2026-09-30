import type { NextConfig } from 'next'

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
}

export default nextConfig
