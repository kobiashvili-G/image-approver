'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin/dashboard')
    } else {
      setError('Wrong password')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2 animate-fade-up" style={{ animationDelay: '0s' }}>
          Admin Access
        </h1>
        <p className="text-stone-500 mb-6 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          Enter the admin password
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-800 text-center text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-600 transition-all"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={!password}
            className="w-full px-4 py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98] text-white hover:shadow-lg hover:shadow-amber-900/20"
            style={{
              background: password
                ? 'linear-gradient(135deg, #dc5b0e, #eb7517)'
                : undefined,
              backgroundColor: password ? undefined : '#292524',
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  )
}
