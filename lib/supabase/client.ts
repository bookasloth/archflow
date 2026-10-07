import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { AUTH_COOKIE_NAME, SUPABASE_PROXY_PATH } from '@/lib/supabase/proxy'

export function createClient() {
  return createBrowserClient<Database>(
    `${window.location.origin}${SUPABASE_PROXY_PATH}`,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: { name: AUTH_COOKIE_NAME } },
  )
}
