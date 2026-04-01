'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ImageData {
  id: string
  url: string
}

function optimizedUrl(url: string, width: number = 800) {
  return `${url}?width=${width}&quality=75`
}

export default function VotePage() {
  const router = useRouter()
  const [voterName, setVoterName] = useState<string | null>(null)
  const [image, setImage] = useState<ImageData | null>(null)
  const [nextImage, setNextImage] = useState<ImageData | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cardAnim, setCardAnim] = useState<'enter' | 'exit-left' | 'exit-right' | null>(null)
  const [pressedBtn, setPressedBtn] = useState<'approve' | 'reject' | null>(null)

  // Reject reason state
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  const fetchNextImage = useCallback(async (name: string) => {
    setLoading(true)
    setCardAnim(null)
    const res = await fetch(`/api/images?voter=${encodeURIComponent(name)}`)
    const data = await res.json()
    if (!data.image) {
      router.push('/done')
      return
    }
    setImage(data.image)
    setNextImage(data.nextImage)
    setRemaining(data.remaining)
    setTotal(data.total)
    setLoading(false)
    requestAnimationFrame(() => setCardAnim('enter'))
  }, [router])

  const prefetchRef = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    if (nextImage) {
      const img = new window.Image()
      img.src = optimizedUrl(nextImage.url)
      prefetchRef.current = img
    }
    return () => { prefetchRef.current = null }
  }, [nextImage])

  useEffect(() => {
    const name = localStorage.getItem('voterName')
    if (!name) {
      router.push('/')
      return
    }
    setVoterName(name)
    fetchNextImage(name)
  }, [router, fetchNextImage])

  // Auto-focus textarea when entering reject mode
  useEffect(() => {
    if (rejectMode && reasonRef.current) {
      reasonRef.current.focus()
    }
  }, [rejectMode])

  function handleRejectClick() {
    setRejectMode(true)
    setRejectReason('')
  }

  function handleRejectCancel() {
    setRejectMode(false)
    setRejectReason('')
  }

  async function handleVote(vote: 'approve' | 'reject', reason?: string) {
    if (!image || !voterName || submitting) return
    setSubmitting(true)
    setPressedBtn(vote)

    const prevImage = image
    const prevNextImage = nextImage
    const prevRemaining = remaining

    const voteBody = JSON.stringify({
      image_id: image.id,
      voter_name: voterName,
      vote,
      ...(reason ? { reason } : {}),
    })

    // Reset reject mode for next image
    setRejectMode(false)
    setRejectReason('')

    if (nextImage) {
      setCardAnim(vote === 'reject' ? 'exit-left' : 'exit-right')
      await new Promise((r) => setTimeout(r, 350))

      setImage(nextImage)
      setNextImage(null)
      setRemaining((r) => r - 1)
      setCardAnim('enter')
      setPressedBtn(null)

      try {
        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: voteBody,
        })
        if (!res.ok) throw new Error('Vote failed')
        const data = await res.json()
        if (data.nextImage) setNextImage(data.nextImage)
        if (data.remaining != null) setRemaining(data.remaining)
        if (data.total != null) setTotal(data.total)
      } catch {
        setImage(prevImage)
        setNextImage(prevNextImage)
        setRemaining(prevRemaining)
        setCardAnim('enter')
      }
    } else {
      setCardAnim(vote === 'reject' ? 'exit-left' : 'exit-right')
      await new Promise((r) => setTimeout(r, 350))

      try {
        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: voteBody,
        })
        if (!res.ok) throw new Error('Vote failed')
        router.push('/done')
        return
      } catch {
        setCardAnim('enter')
        setPressedBtn(null)
      }
    }
    setSubmitting(false)
  }

  if (!voterName || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="h-4 w-20 mx-auto mb-4 rounded-full bg-stone-800 skeleton-pulse" />
          <div className="w-full aspect-[4/3] rounded-2xl bg-stone-900 skeleton-pulse mb-6" />
          <div className="flex gap-4 justify-center">
            <div className="h-14 w-36 rounded-2xl bg-stone-900 skeleton-pulse" />
            <div className="h-14 w-36 rounded-2xl bg-stone-900 skeleton-pulse" />
          </div>
        </div>
      </main>
    )
  }

  const current = total - remaining + 1
  const progress = total > 0 ? current / total : 0
  const canSubmitReject = rejectReason.trim().length > 0

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Progress section */}
        <div className="mb-5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-stone-500 text-xs font-medium tracking-wide uppercase">
              Review Progress
            </span>
            <span className="text-stone-400 text-sm tabular-nums font-medium">
              {current}<span className="text-stone-600">/</span>{total}
            </span>
          </div>
          <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, #dc5b0e, #ef8c38)',
              }}
            />
          </div>
        </div>

        {/* Image card */}
        {image && (
          <div
            className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-stone-900 mb-6 ${
              cardAnim === 'enter' ? 'card-enter' :
              cardAnim === 'exit-left' ? 'card-exit-left' :
              cardAnim === 'exit-right' ? 'card-exit-right' : ''
            }`}
            style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <Image
              src={optimizedUrl(image.url)}
              alt="Image to review"
              fill
              unoptimized
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 672px"
              priority
            />
          </div>
        )}

        {/* Vote area */}
        <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
          {rejectMode ? (
            /* Reject reason input — button swap */
            <div className="bg-stone-900 border border-red-800/50 rounded-2xl p-4 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-red-300 text-xs font-semibold uppercase tracking-wide">
                  Rejecting — why?
                </span>
              </div>
              <textarea
                ref={reasonRef}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Type your reason..."
                rows={2}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 placeholder-stone-600 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-700 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && canSubmitReject) {
                    e.preventDefault()
                    handleVote('reject', rejectReason.trim())
                  }
                  if (e.key === 'Escape') {
                    handleRejectCancel()
                  }
                }}
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleRejectCancel}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 text-sm font-medium transition-all active:scale-[0.98]"
                >
                  ← Back
                </button>
                <button
                  onClick={() => handleVote('reject', rejectReason.trim())}
                  disabled={!canSubmitReject || submitting}
                  className={`
                    flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all
                    ${canSubmitReject && !submitting
                      ? 'bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white'
                      : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                    }
                    ${submitting ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 btn-shimmer text-white/80' : ''}
                  `}
                >
                  Reject →
                </button>
              </div>
            </div>
          ) : (
            /* Normal vote buttons */
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRejectClick}
                disabled={submitting}
                className={`
                  group relative px-10 py-3.5 rounded-2xl font-semibold text-base
                  transition-all duration-200 overflow-hidden
                  ${submitting && pressedBtn === 'reject'
                    ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 btn-shimmer text-white/80'
                    : submitting
                      ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      : 'bg-red-600/90 hover:bg-red-500 active:scale-95 text-white hover:shadow-lg hover:shadow-red-900/30'
                  }
                `}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                  Reject
                </span>
              </button>
              <button
                onClick={() => handleVote('approve')}
                disabled={submitting}
                className={`
                  group relative px-10 py-3.5 rounded-2xl font-semibold text-base
                  transition-all duration-200 overflow-hidden
                  ${submitting && pressedBtn === 'approve'
                    ? 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 btn-shimmer text-white/80'
                    : submitting
                      ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      : 'bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-white hover:shadow-lg hover:shadow-emerald-900/30'
                  }
                `}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Approve
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
