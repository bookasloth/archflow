// Browsers never talk to *.supabase.co directly: some ISPs (seen on Indian broadband
// routers) DNS-block that domain, so login/uploads failed with "Failed to fetch" on
// those networks. next.config.ts rewrites /sb/* on our own domain to Supabase instead.
export const SUPABASE_PROXY_PATH = '/sb'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Supabase names the auth cookie after the URL's host. The browser client now uses
// our host, so pin the name to the real project ref — server and browser must agree.
export const AUTH_COOKIE_NAME = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`

// Signed storage URLs are minted server-side with the real host; route them via the proxy.
export function viaProxy(url: string): string {
  return url.startsWith(SUPABASE_URL) ? SUPABASE_PROXY_PATH + url.slice(SUPABASE_URL.length) : url
}
