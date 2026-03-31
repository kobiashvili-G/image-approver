'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

interface AdminImage {
  id: string
  filename: string
  url: string
  approved: number
  rejected: number
  total: number
  approvalPct: number | null
}

type FilterType = 'all' | 'gte80' | 'gte60' | 'lt50' | 'none'

export default function AdminDashboard() {
  const [images, setImages] = useState<AdminImage[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortAsc, setSortAsc] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const fetchImages = useCallback(async () => {
    const res = await fetch('/api/admin/images')
    const data = await res.json()
    setImages(data.images)
  }, [])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const filtered = images.filter((img) => {
    if (filter === 'all') return true
    if (filter === 'none') return img.total === 0
    if (filter === 'gte80') return img.approvalPct !== null && img.approvalPct >= 80
    if (filter === 'gte60') return img.approvalPct !== null && img.approvalPct >= 60
    if (filter === 'lt50') return img.approvalPct !== null && img.approvalPct < 50
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a.approvalPct ?? -1
    const bVal = b.approvalPct ?? -1
    return sortAsc ? aVal - bVal : bVal - aVal
  })

  const totalVotes = images.reduce((sum, img) => sum + img.total, 0)

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
  }

  async function handleReset(id: string) {
    if (!confirm('Reset all votes for this image?')) return
    await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_ids: [id] }),
    })
    fetchImages()
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

  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Image Feedback — Admin</h1>
          <p className="text-gray-500 text-sm">
            {images.length} images · {totalVotes} total votes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-medium transition-colors"
          >
            + Upload Images
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-900 rounded-lg">
        <span className="text-gray-500 text-xs uppercase tracking-wider">Filter:</span>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                filter === f.key
                  ? 'bg-gray-700 text-gray-100'
                  : 'border border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-gray-500 text-xs">
          Showing {sorted.length} of {images.length}
        </span>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-purple-950/30 border border-purple-500/20 rounded-lg">
          <span className="text-purple-200 text-sm">{selected.size} selected</span>
          <button
            onClick={handleBulkDownload}
            className="px-3 py-1 rounded-lg bg-purple-600 text-white text-xs font-medium"
          >
            ⬇ Download
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

      {/* Table */}
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-gray-500 uppercase text-xs tracking-wider">
              <th className="p-3 text-left w-8">
                <input
                  type="checkbox"
                  checked={selected.size === sorted.length && sorted.length > 0}
                  onChange={toggleSelectAll}
                  className="accent-purple-600"
                />
              </th>
              <th className="p-3 text-left">Image</th>
              <th className="p-3 text-left">Filename</th>
              <th className="p-3 text-center">Approved</th>
              <th className="p-3 text-center">Rejected</th>
              <th className="p-3 text-center">Total</th>
              <th
                className="p-3 text-center cursor-pointer hover:text-gray-300"
                onClick={() => setSortAsc(!sortAsc)}
              >
                Approval % {sortAsc ? '↑' : '↓'}
              </th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((img) => (
              <tr
                key={img.id}
                className={`border-t border-gray-800 ${
                  selected.has(img.id) ? 'bg-gray-900/50' : ''
                }`}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(img.id)}
                    onChange={() => toggleSelect(img.id)}
                    className="accent-purple-600"
                  />
                </td>
                <td className="p-3">
                  <div className="w-12 h-9 relative rounded overflow-hidden bg-gray-800">
                    <Image
                      src={`${img.url}?width=96&quality=60`}
                      alt={img.filename}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                </td>
                <td className="p-3 text-gray-300">{img.filename}</td>
                <td className="p-3 text-center text-green-500 font-semibold">{img.approved}</td>
                <td className="p-3 text-center text-red-500 font-semibold">{img.rejected}</td>
                <td className="p-3 text-center">{img.total}</td>
                <td className="p-3 text-center">
                  {img.approvalPct !== null ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        img.approvalPct >= 60
                          ? 'bg-green-900/40 text-green-400'
                          : 'bg-red-900/40 text-red-400'
                      }`}
                    >
                      {img.approvalPct}%
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => handleReset(img.id)}
                    className="text-gray-500 hover:text-gray-300 text-xs"
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

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Upload Images</h2>
            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center mb-4 hover:border-purple-500 transition-colors"
            >
              <p className="text-gray-400 mb-2">Drag & drop images here</p>
              <p className="text-gray-600 text-sm mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
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
            {uploading && <p className="text-purple-400 text-sm mb-4">{uploadProgress}</p>}
            <button
              onClick={() => setShowUpload(false)}
              className="w-full px-4 py-2 border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
