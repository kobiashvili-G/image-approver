'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

interface AdminImage {
  id: string
  filename: string
  url: string
  created_at: string
  approved: number
  rejected: number
  total: number
  approvalPct: number | null
}

interface Voter {
  name: string
  approved: number
  rejected: number
  total: number
  approvalRate: number | null
  totalImages: number
}

interface Disagreement {
  imageId: string
  filename: string
  url: string
  approves: number
  rejects: number
  total: number
  disagreementScore: number
  votes: { voter: string; vote: string }[]
}

type TabType = 'images' | 'voters' | 'disagreements'
type FilterType = 'all' | 'gte80' | 'gte60' | 'lt50' | 'none'
type DateFilterType = 'all' | 'today' | 'week' | 'month'
type SortField = 'approval' | 'date'
type SortDir = 'asc' | 'desc'

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isWithinDateRange(iso: string, range: DateFilterType): boolean {
  if (range === 'all') return true
  const d = new Date(iso)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'today') return d >= startOfDay
  if (range === 'week') {
    const weekAgo = new Date(startOfDay)
    weekAgo.setDate(weekAgo.getDate() - 7)
    return d >= weekAgo
  }
  // month
  const monthAgo = new Date(startOfDay)
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  return d >= monthAgo
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<TabType>('images')
  const [images, setImages] = useState<AdminImage[]>([])
  const [voters, setVoters] = useState<Voter[]>([])
  const [disagreements, setDisagreements] = useState<Disagreement[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('approval')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image preview state
  const [previewImg, setPreviewImg] = useState<AdminImage | null>(null)
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null)
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchImages = useCallback(async () => {
    const res = await fetch('/api/admin/images')
    const data = await res.json()
    setImages(data.images)
  }, [])

  const fetchVoterData = useCallback(async () => {
    const res = await fetch('/api/admin/voters')
    const data = await res.json()
    setVoters(data.voters)
    setDisagreements(data.disagreements)
  }, [])

  useEffect(() => {
    fetchImages()
    fetchVoterData()
  }, [fetchImages, fetchVoterData])

  const filtered = images.filter((img) => {
    // Approval filter
    if (filter === 'none' && img.total !== 0) return false
    if (filter === 'gte80' && (img.approvalPct === null || img.approvalPct < 80)) return false
    if (filter === 'gte60' && (img.approvalPct === null || img.approvalPct < 60)) return false
    if (filter === 'lt50' && (img.approvalPct === null || img.approvalPct >= 50)) return false
    // Date filter
    if (!isWithinDateRange(img.created_at, dateFilter)) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'approval') {
      const aVal = a.approvalPct ?? -1
      const bVal = b.approvalPct ?? -1
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    }
    const aDate = new Date(a.created_at).getTime()
    const bDate = new Date(b.created_at).getTime()
    return sortDir === 'asc' ? aDate - bDate : bDate - aDate
  })

  const totalVotes = images.reduce((sum, img) => sum + img.total, 0)

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  function toggleSelect(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleSelectAll() {
    if (selected.size === sorted.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sorted.map((img) => img.id)))
    }
  }

  function handleThumbnailEnter(img: AdminImage, e: React.MouseEvent) {
    if (previewTimeout.current) clearTimeout(previewTimeout.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const viewportH = window.innerHeight
    // Position preview to the right of thumbnail, vertically centered
    const x = rect.right + 12
    // If too close to bottom, show above
    const y = rect.top + rect.height / 2 > viewportH / 2
      ? rect.top - 200
      : rect.top - 40
    setPreviewImg(img)
    setPreviewPos({ x, y })
  }

  function handleThumbnailLeave() {
    previewTimeout.current = setTimeout(() => {
      setPreviewImg(null)
      setPreviewPos(null)
    }, 100)
  }

  async function handleUpload(files: FileList | File[]) {
    setUploading(true)
    setUploadProgress(`Uploading ${files.length} file(s)...`)
    const formData = new FormData()
    Array.from(files).forEach((f) => formData.append('files', f))
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setUploadProgress(`Uploaded ${data.uploaded} file(s)`)
    setUploading(false)
    setShowUpload(false)
    fetchImages()
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} image(s) and all their votes?`)) return
    await fetch('/api/admin/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_ids: Array.from(selected) }),
    })
    setSelected(new Set())
    fetchImages()
    fetchVoterData()
  }

  async function handleBulkReset() {
    if (!confirm(`Reset votes for ${selected.size} image(s)?`)) return
    await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_ids: Array.from(selected) }),
    })
    setSelected(new Set())
    fetchImages()
    fetchVoterData()
  }

  async function handleBulkDownload() {
    const res = await fetch('/api/admin/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_ids: Array.from(selected) }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'images.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportCsv() {
    const res = await fetch('/api/admin/export')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'votes-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this image and all its votes?')) return
    await fetch('/api/admin/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_ids: [id] }),
    })
    fetchImages()
    fetchVoterData()
  }

  async function handleReset(id: string) {
    if (!confirm('Reset all votes for this image?')) return
    await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_ids: [id] }),
    })
    fetchImages()
    fetchVoterData()
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'gte80', label: '≥ 80%' },
    { key: 'gte60', label: '≥ 60%' },
    { key: 'lt50', label: '< 50%' },
    { key: 'none', label: 'No votes' },
  ]

  const dateFilters: { key: DateFilterType; label: string }[] = [
    { key: 'all', label: 'Any time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This week' },
    { key: 'month', label: 'This month' },
  ]

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'images', label: 'Images', count: images.length },
    { key: 'voters', label: 'Voters', count: voters.length },
    { key: 'disagreements', label: 'Disagreements', count: disagreements.length },
  ]

  function splitLabel(approves: number, rejects: number) {
    return `${approves}/${rejects} split`
  }

  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Image Feedback — Admin</h1>
          <p className="text-stone-500 text-sm">
            {images.length} images · {voters.length} voters · {totalVotes} total votes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.98] text-white hover:shadow-lg hover:shadow-amber-900/20"
            style={{ background: 'linear-gradient(135deg, #dc5b0e, #eb7517)' }}
          >
            + Upload Images
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-lg border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700 text-sm transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-stone-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab === t.key
                ? 'text-stone-100 border-amber-500'
                : 'text-stone-500 border-transparent hover:text-stone-300'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Images Tab */}
      {tab === 'images' && (
        <>
          {/* Filter Bar */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-stone-900 rounded-lg flex-wrap">
            <span className="text-stone-500 text-xs uppercase tracking-wider">Approval:</span>
            <div className="flex gap-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    filter === f.key
                      ? 'bg-stone-700 text-stone-100'
                      : 'border border-stone-700 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-stone-700 mx-1" />

            <span className="text-stone-500 text-xs uppercase tracking-wider">Added:</span>
            <div className="flex gap-2">
              {dateFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setDateFilter(f.key)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    dateFilter === f.key
                      ? 'bg-stone-700 text-stone-100'
                      : 'border border-stone-700 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1" />
            <span className="text-stone-500 text-xs">
              Showing {sorted.length} of {images.length}
            </span>
          </div>

          {/* Bulk Actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 mb-3 p-3 bg-amber-950/30 border border-amber-500/20 rounded-lg">
              <span className="text-amber-200 text-sm">{selected.size} selected</span>
              <button
                onClick={handleBulkDownload}
                className="px-3 py-1 rounded-lg text-white text-xs font-medium"
                style={{ background: 'linear-gradient(135deg, #dc5b0e, #eb7517)' }}
              >
                Download
              </button>
              <button
                onClick={handleBulkReset}
                className="px-3 py-1 rounded-lg border border-red-500/30 text-red-400 text-xs"
              >
                Reset Votes
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 rounded-lg border border-red-500/30 text-red-400 text-xs"
              >
                Delete
              </button>
            </div>
          )}

          {/* Images Table */}
          <div className="border border-stone-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-900 text-stone-500 uppercase text-xs tracking-wider">
                  <th className="p-3 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === sorted.length && sorted.length > 0}
                      onChange={toggleSelectAll}
                      className="accent-amber-600"
                    />
                  </th>
                  <th className="p-3 text-left">Image</th>
                  <th className="p-3 text-left">Filename</th>
                  <th
                    className="p-3 text-left cursor-pointer hover:text-stone-300 select-none"
                    onClick={() => handleSort('date')}
                  >
                    Added{sortIndicator('date')}
                  </th>
                  <th className="p-3 text-center">Approved</th>
                  <th className="p-3 text-center">Rejected</th>
                  <th className="p-3 text-center">Total</th>
                  <th
                    className="p-3 text-center cursor-pointer hover:text-stone-300 select-none"
                    onClick={() => handleSort('approval')}
                  >
                    Approval %{sortIndicator('approval')}
                  </th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((img) => (
                  <tr
                    key={img.id}
                    className={`border-t border-stone-800 transition-colors ${
                      selected.has(img.id) ? 'bg-stone-900/50' : ''
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(img.id)}
                        onChange={() => toggleSelect(img.id)}
                        className="accent-amber-600"
                      />
                    </td>
                    <td className="p-3">
                      <div
                        className="w-12 h-9 relative rounded overflow-hidden bg-stone-800 cursor-pointer ring-1 ring-stone-700 hover:ring-amber-500/50 transition-all"
                        onMouseEnter={(e) => handleThumbnailEnter(img, e)}
                        onMouseLeave={handleThumbnailLeave}
                      >
                        <Image
                          src={`${img.url}?width=96&quality=60`}
                          alt={img.filename}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    </td>
                    <td className="p-3 text-stone-300">{img.filename}</td>
                    <td className="p-3 text-stone-500 text-xs">{formatDate(img.created_at)}</td>
                    <td className="p-3 text-center text-emerald-500 font-semibold">{img.approved}</td>
                    <td className="p-3 text-center text-red-500 font-semibold">{img.rejected}</td>
                    <td className="p-3 text-center">{img.total}</td>
                    <td className="p-3 text-center">
                      {img.approvalPct !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            img.approvalPct >= 60
                              ? 'bg-emerald-900/40 text-emerald-400'
                              : 'bg-red-900/40 text-red-400'
                          }`}
                        >
                          {img.approvalPct}%
                        </span>
                      ) : (
                        <span className="text-stone-600">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleReset(img.id)}
                        className="text-stone-500 hover:text-stone-300 text-xs"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => handleDelete(img.id)}
                        className="text-red-500 hover:text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Voters Tab */}
      {tab === 'voters' && (
        <div className="border border-stone-800 rounded-lg overflow-hidden">
          {voters.length === 0 ? (
            <div className="p-12 text-center text-stone-500">No votes yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-900 text-stone-500 uppercase text-xs tracking-wider">
                  <th className="p-3 text-left">Voter</th>
                  <th className="p-3 text-center">Approved</th>
                  <th className="p-3 text-center">Rejected</th>
                  <th className="p-3 text-center">Total Votes</th>
                  <th className="p-3 text-center">Approval Rate</th>
                  <th className="p-3 text-center">Progress</th>
                </tr>
              </thead>
              <tbody>
                {voters.map((v) => (
                  <tr key={v.name} className="border-t border-stone-800">
                    <td className="p-3 font-medium text-stone-200">{v.name}</td>
                    <td className="p-3 text-center text-emerald-500 font-semibold">{v.approved}</td>
                    <td className="p-3 text-center text-red-500 font-semibold">{v.rejected}</td>
                    <td className="p-3 text-center">{v.total}</td>
                    <td className="p-3 text-center">
                      {v.approvalRate !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            v.approvalRate >= 60
                              ? 'bg-emerald-900/40 text-emerald-400'
                              : 'bg-red-900/40 text-red-400'
                          }`}
                        >
                          {v.approvalRate}%
                        </span>
                      ) : (
                        <span className="text-stone-600">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {v.total >= v.totalImages ? (
                        <span className="text-emerald-400 text-xs">{v.total}/{v.totalImages} ✓</span>
                      ) : (
                        <span className="text-amber-500 text-xs">{v.total}/{v.totalImages}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Disagreements Tab */}
      {tab === 'disagreements' && (
        <div>
          {disagreements.length === 0 ? (
            <div className="p-12 text-center text-stone-500 border border-stone-800 rounded-lg">
              No disagreements yet — need at least 2 voters on an image with different votes
            </div>
          ) : (
            <>
              <p className="text-stone-500 text-sm mb-4">
                Images sorted by disagreement — most contested first
              </p>
              <div className="flex flex-col gap-3">
                {disagreements.map((d) => (
                  <div
                    key={d.imageId}
                    className="bg-stone-900 border border-stone-800 rounded-lg p-4 flex gap-4 items-center"
                  >
                    <div className="w-20 h-15 relative rounded overflow-hidden bg-stone-800 flex-shrink-0">
                      <Image
                        src={`${d.url}?width=160&quality=60`}
                        alt={d.filename}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-stone-200 font-medium truncate">{d.filename}</span>
                        <span className="ml-2 flex-shrink-0 bg-amber-900/40 text-amber-300 px-2.5 py-0.5 rounded-full text-xs">
                          {splitLabel(d.approves, d.rejects)}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {d.votes.map((vote, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-0.5 rounded ${
                              vote.vote === 'approve'
                                ? 'bg-emerald-900/40 text-emerald-400'
                                : 'bg-red-900/40 text-red-400'
                            }`}
                          >
                            {vote.voter} {vote.vote === 'approve' ? '✓' : '✗'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 w-full max-w-md animate-fade-up">
            <h2 className="text-lg font-bold mb-4">Upload Images</h2>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-stone-700 rounded-lg p-8 text-center mb-4 hover:border-amber-500 transition-colors"
            >
              <p className="text-stone-400 mb-2">Drag & drop images here</p>
              <p className="text-stone-600 text-sm mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all text-white"
                style={{ background: 'linear-gradient(135deg, #dc5b0e, #eb7517)' }}
              >
                Choose Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
            </div>
            {uploading && <p className="text-amber-400 text-sm mb-4">{uploadProgress}</p>}
            <button
              onClick={() => setShowUpload(false)}
              className="w-full px-4 py-2 border border-stone-700 rounded-lg text-stone-400 hover:text-stone-200 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Image Preview Popover */}
      {previewImg && previewPos && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: previewPos.x,
            top: previewPos.y,
          }}
        >
          <div
            className="w-80 rounded-xl overflow-hidden border border-stone-700 bg-stone-900 shadow-2xl shadow-black/60"
            style={{
              animation: 'preview-appear 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div className="relative w-80 aspect-[4/3]">
              <Image
                src={`${previewImg.url}?width=640&quality=80`}
                alt={previewImg.filename}
                fill
                unoptimized
                className="object-contain bg-stone-950"
                sizes="320px"
              />
            </div>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-stone-300 text-xs truncate">{previewImg.filename}</span>
              {previewImg.approvalPct !== null && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ml-2 flex-shrink-0 ${
                    previewImg.approvalPct >= 60
                      ? 'bg-emerald-900/40 text-emerald-400'
                      : 'bg-red-900/40 text-red-400'
                  }`}
                >
                  {previewImg.approvalPct}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes preview-appear {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </main>
  )
}
