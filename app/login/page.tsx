'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/')
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 font-heading text-2xl font-semibold text-ink">Archflow</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full rounded border p-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="w-full rounded bg-primary p-2 font-medium text-primary-fg hover:bg-primary-hover" type="submit">
          Sign in
        </button>
      </form>
      <p className="mt-4 text-xs text-ink-muted">Accounts are created by an admin in Supabase.</p>
    </main>
  )
}
