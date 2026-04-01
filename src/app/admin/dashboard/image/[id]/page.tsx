'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ImageDetail {
  id: string
  filename: string
  url: string
  created_at: string
  approved: number
  rejected: number
  total: number
  approvalPct: number | null
}

interface Vote {
  voter_name: string
  vote: 'approve' | 'reject'
  reason: string | null
  created_at: string
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ImageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [image, setImage] = useState<ImageDetail | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'reject' | 'approve'>('all')

  useEffect(() => {
    fetch(`/api/admin/images/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((data) => {
        setImage(data.image)
        setVotes(data.votes)
        setLoading(false)
      })
      .catch(() => {
        router.push('/admin/dashboard')
      })
  }, [id, router])

  if (loading || !image) {
    return (
      <main className="min-h-screen p-6 max-w-5xl mx-auto">
        <div className="h-6 w-32 bg-stone-800 rounded skeleton-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="aspect-[4/3] bg-stone-900 rounded-2xl skeleton-pulse" />
          <div className="space-y-4">
            <div className="h-10 bg-stone-900 rounded-xl skeleton-pulse" />
            <div className="h-24 bg-stone-900 rounded-xl skeleton-pulse" />
            <div className="h-24 bg-stone-900 rounded-xl skeleton-pulse" />
          </div>
        </div>
      </main>
    )
  }

  const filteredVotes = votes.filter((v) => {
    if (filterType === 'all') return true
    return v.vote === filterType
  })

  const rejections = votes.filter((v) => v.vote === 'reject')
  const approvals = votes.filter((v) => v.vote === 'approve')

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Back nav */}
      <button
        onClick={() => router.push('/admin/dashboard')}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-300 text-sm mb-6 transition-colors group"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
        </svg>
        Back to Dashboard
      </button>

      {/* Image header */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Image — takes 3 cols */}
        <div className="lg:col-span-3">
          <div
            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-stone-900 animate-fade-up"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          >
            <Image
              src={`${image.url}?width=1200&quality=85`}
              alt={image.filename}
              fill
              unoptimized
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
          </div>
        </div>

        {/* Stats panel — takes 2 cols */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <h1 className="text-lg font-bold text-stone-100 mb-1 truncate">{image.filename}</h1>
            <p className="text-stone-500 text-xs">
              Added {timeAgo(image.created_at)} · {image.total} vote{image.total !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-stone-900 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-emerald-500">{image.approved}</div>
              <div className="text-stone-600 text-xs mt-0.5">Approved</div>
            </div>
            <div className="bg-stone-900 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-500">{image.rejected}</div>
              <div className="text-stone-600 text-xs mt-0.5">Rejected</div>
            </div>
            <div className="bg-stone-900 rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold ${
                image.approvalPct !== null && image.approvalPct >= 60 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {image.approvalPct !== null ? `${image.approvalPct}%` : '—'}
              </div>
              <div className="text-stone-600 text-xs mt-0.5">Approval</div>
            </div>
          </div>

          {/* Approval bar */}
          {image.total > 0 && (
            <div className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(image.approved / image.total) * 100}%` }}
                />
                <div
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${(image.rejected / image.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick summary */}
          {rejections.length > 0 && (
            <div
              className="bg-red-950/20 border border-red-900/30 rounded-xl p-3 animate-fade-up"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="text-red-300 text-xs font-semibold uppercase tracking-wide mb-1">
                {rejections.length} rejection{rejections.length !== 1 ? 's' : ''}
              </div>
              <p className="text-stone-400 text-xs leading-relaxed">
                {rejections.filter(r => r.reason).length} with reasons provided
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Votes section */}
      <div className="animate-fade-up" style={{ animationDelay: '0.25s' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
            Voter Feedback
          </h2>
          <div className="flex gap-2">
            {(['all', 'reject', 'approve'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  filterType === f
                    ? 'bg-stone-700 text-stone-100'
                    : 'border border-stone-700 text-stone-500 hover:text-stone-300'
                }`}
              >
                {f === 'all' ? `All (${votes.length})` :
                 f === 'reject' ? `Rejections (${rejections.length})` :
                 `Approvals (${approvals.length})`}
              </button>
            ))}
          </div>
        </div>

        {filteredVotes.length === 0 ? (
          <div className="text-center py-12 text-stone-600">
            No {filterType === 'all' ? 'votes' : filterType === 'reject' ? 'rejections' : 'approvals'} yet
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVotes.map((v, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 border transition-all ${
                  v.vote === 'reject'
                    ? 'bg-red-950/10 border-red-900/20'
                    : 'bg-emerald-950/10 border-emerald-900/20'
                }`}
                style={{
                  animationDelay: `${0.3 + i * 0.03}s`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar circle */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      v.vote === 'reject'
                        ? 'bg-red-900/40 text-red-400'
                        : 'bg-emerald-900/40 text-emerald-400'
                    }`}>
                      {v.voter_name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-200 text-sm font-medium">{v.voter_name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          v.vote === 'reject'
                            ? 'bg-red-900/40 text-red-400'
                            : 'bg-emerald-900/40 text-emerald-400'
                        }`}>
                          {v.vote === 'approve' ? '✓ Approved' : '✗ Rejected'}
                        </span>
                      </div>

                      {v.reason && (
                        <p className="text-stone-400 text-sm mt-1.5 leading-relaxed">
                          &ldquo;{v.reason}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-stone-600 text-xs flex-shrink-0 mt-0.5">
                    {timeAgo(v.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
