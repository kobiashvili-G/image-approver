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
        <div className="text-gray-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">All done!</h1>
        <p className="text-gray-400 mb-8">You reviewed {stats.total} images</p>

        <div className="flex justify-center gap-12 mb-8">
          <div>
            <div className="text-3xl font-bold text-green-500">{stats.approved}</div>
            <div className="text-gray-500 text-sm">Approved</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-500">{stats.rejected}</div>
            <div className="text-gray-500 text-sm">Rejected</div>
          </div>
        </div>

        <p className="text-gray-500">Thanks for your feedback!</p>
      </div>
    </main>
  )
}
