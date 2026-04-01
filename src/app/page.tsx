'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [name, setName] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem('voterName', trimmed.toLowerCase())
    router.push('/vote')
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div
          className="animate-fade-up"
          style={{ animationDelay: '0s' }}
        >
          <div className="w-12 h-12 mx-auto mb-5 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #dc5b0e, #ef8c38)' }}
          >
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        </div>

        <h1
          className="text-3xl font-bold mb-2 animate-fade-up"
          style={{ animationDelay: '0.05s' }}
        >
          Image Feedback
        </h1>
        <p
          className="text-stone-500 mb-8 animate-fade-up"
          style={{ animationDelay: '0.1s' }}
        >
          Help us pick the best images
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 animate-fade-up"
          style={{ animationDelay: '0.15s' }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-800 text-center text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-600 transition-all"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full px-4 py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98] text-white hover:shadow-lg hover:shadow-amber-900/20"
            style={{
              background: name.trim()
                ? 'linear-gradient(135deg, #dc5b0e, #eb7517)'
                : undefined,
              backgroundColor: name.trim() ? undefined : '#292524',
            }}
          >
            Start Reviewing
          </button>
        </form>
      </div>
    </main>
  )
}
