import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // sb/ = Supabase proxy (rewrite): must not hit the auth gate, or login itself would redirect.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sb/|.*\\.(?:svg|png|jpg|jpeg|webmanifest)$).*)'],
}
