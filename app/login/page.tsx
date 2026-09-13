'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Admin email people contact for access / password resets. Change to your workspace admin.
const ADMIN_EMAIL = 'pranav@arcflow.xyz'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setBusy(false) }
    else router.push('/')
  }

  return (
    <main className="grid min-h-screen bg-bg lg:grid-cols-2">
      {/* Left — form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary font-heading text-sm font-bold text-primary-fg">A</span>
            <span className="font-heading text-lg font-semibold text-ink">Archflow</span>
          </div>

          <h1 className="font-heading text-2xl font-semibold text-ink">Sign in to your workspace</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Enter your details to continue.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-ink-muted">Email address</label>
              <input
                id="email" type="email" autoComplete="email" required
                placeholder="you@studio.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-ink-muted">Password</label>
              <div className="relative">
                <input
                  id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 pr-11 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
                />
                <button
                  type="button" onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-faint hover:text-ink"
                >{show ? '🙈' : '👁'}</button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-subtle bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <button
              type="submit" disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'} <span aria-hidden>→</span>
            </button>
          </form>

          <div className="mt-6 space-y-2 border-t border-subtle pt-5 text-sm text-ink-muted">
            <p>
              <span className="font-medium text-ink">No account?</span> Accounts are created by your workspace administrator.
              {' '}<a href={`mailto:${ADMIN_EMAIL}?subject=Archflow%20access%20request`} className="text-primary hover:underline">Request access</a>.
            </p>
            <p>
              <span className="font-medium text-ink">Forgot your password?</span>{' '}
              <a href={`mailto:${ADMIN_EMAIL}?subject=Archflow%20password%20reset`} className="text-primary hover:underline">Ask an admin to reset it</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Right — brand panel (hidden on small screens) */}
      <aside className="relative hidden overflow-hidden lg:flex" style={{ background: 'linear-gradient(150deg,#201f1d 0%,#1A1A19 55%,#241a12 100%)' }}>
        <div className="flex w-full flex-col justify-between p-12 text-white">
          <div>
            <div className="mb-16 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary font-heading text-sm font-bold text-white">A</span>
              <span className="font-heading text-lg font-semibold">Archflow</span>
              <span className="ml-1 text-sm text-white/50">for studios</span>
            </div>

            <p aria-hidden className="font-heading text-5xl font-bold leading-none text-primary">“</p>
            <p className="mt-2 max-w-md font-heading text-2xl font-semibold leading-snug text-white">
              Every drawing, site issue, material and task — one calm workspace your whole studio can work inside all day.
            </p>
            <p className="mt-5 text-sm text-white/60">The operating system for architecture &amp; construction projects.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 border-t border-white/10 pt-8 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-white">
                <span aria-hidden>🚀</span> Pick up where you left off
              </div>
              <p className="text-sm text-white/60">Your projects, drawings, and open site issues are waiting.</p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-white">
                <span aria-hidden>📖</span> Need help?
              </div>
              <p className="text-sm text-white/60">
                Contact your admin at{' '}
                <a href={`mailto:${ADMIN_EMAIL}`} className="text-primary hover:underline">{ADMIN_EMAIL}</a>,
                or open the in-app Guide under Admin.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </main>
  )
}
