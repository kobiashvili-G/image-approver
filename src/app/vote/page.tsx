'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ImageData {
  id: string
  url: string
}

// Append Supabase image transform params for faster loading
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
  const [fadeIn, setFadeIn] = useState(false)

  const fetchNextImage = useCallback(async (name: string) => {
    setLoading(true)
    setFadeIn(false)
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
    requestAnimationFrame(() => setFadeIn(true))
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

  async function handleVote(vote: 'approve' | 'reject') {
    if (!image || !voterName || submitting) return
    setSubmitting(true)
    await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: image.id,
        voter_name: voterName,
        vote,
      }),
    })
    setSubmitting(false)
    fetchNextImage(voterName)
  }

  if (!voterName || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </main>
    )
  }

  const current = total - remaining + 1

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <p className="text-center text-gray-500 text-sm mb-4">
          {current} of {total}
        </p>

        {image && (
          <div
            className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-900 mb-6 transition-opacity duration-300 ${
              fadeIn ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={optimizedUrl(image.url)}
              alt="Image to review"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 672px"
              priority
            />
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleVote('reject')}
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 font-medium text-lg transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => handleVote('approve')}
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 font-medium text-lg transition-colors"
          >
            Approve
          </button>
        </div>
      </div>
    </main>
  )
}
