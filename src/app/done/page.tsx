'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DonePage() {
  const router = useRouter()
  const [stats, setStats] = useState<{ total: number; approved: number; rejected: number } | null>(null)

  useEffect(() => {
    const name = localStorage.getItem('voterName')
    if (!name) {
      router.push('/')
      return
    }

    fetch(`/api/voter-stats?voter=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then(setStats)
  }, [router])

  if (!stats) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-stone-500">Loading...</div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <div
          className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center animate-fade-up"
          style={{
            background: 'linear-gradient(135deg, #dc5b0e, #ef8c38)',
            animationDelay: '0s',
          }}
        >
          <svg className="w-8 h-8 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        </div>

        <h1
          className="text-2xl font-bold mb-2 animate-fade-up"
          style={{ animationDelay: '0.05s' }}
        >
          All done!
        </h1>
        <p
          className="text-stone-500 mb-8 animate-fade-up"
          style={{ animationDelay: '0.1s' }}
        >
          You reviewed {stats.total} images
        </p>

        <div
          className="flex justify-center gap-12 mb-8 animate-fade-up"
          style={{ animationDelay: '0.15s' }}
        >
          <div>
            <div className="text-3xl font-bold text-emerald-500">{stats.approved}</div>
            <div className="text-stone-600 text-sm">Approved</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-500">{stats.rejected}</div>
            <div className="text-stone-600 text-sm">Rejected</div>
          </div>
        </div>

        <p
          className="text-stone-600 animate-fade-up"
          style={{ animationDelay: '0.2s' }}
        >
          Thanks for your feedback!
        </p>
      </div>
    </main>
  )
}
