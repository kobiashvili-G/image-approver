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

    document.cookie = `admin_session=${password}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`

    const res = await fetch('/api/admin/images')
    if (res.ok) {
      router.push('/admin/dashboard')
    } else {
      setError('Wrong password')
      document.cookie = 'admin_session=; path=/; max-age=0'
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
        <p className="text-gray-400 mb-6">Enter the admin password</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-center text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={!password}
            className="w-full px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  )
}
