# Image Feedback Collection App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark-themed web app where users identify themselves by name, vote approve/reject on images one at a time, and an admin can manage images and view results.

**Architecture:** Next.js App Router with TypeScript. Supabase for PostgreSQL database and image storage. Tailwind CSS for dark-mode styling. Middleware protects admin routes with a simple password. Deployed on Vercel.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, @supabase/supabase-js, @supabase/ssr, JSZip (for bulk download), Vercel

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with dark theme, fonts
│   ├── page.tsx                # Login screen (name input)
│   ├── vote/
│   │   └── page.tsx            # Voting screen (client component)
│   ├── done/
│   │   └── page.tsx            # Summary + thank you (client component)
│   ├── admin/
│   │   ├── page.tsx            # Admin login (password input)
│   │   └── dashboard/
│   │       └── page.tsx        # Admin dashboard (client component)
│   └── api/
│       ├── images/
│       │   └── route.ts        # GET next unvoted image for voter
│       ├── vote/
│       │   └── route.ts        # POST submit a vote
│       ├── voter-stats/
│       │   └── route.ts        # GET voter summary stats
│       └── admin/
│           ├── images/
│           │   └── route.ts    # GET all images with vote counts
│           ├── upload/
│           │   └── route.ts    # POST bulk upload images
│           ├── delete/
│           │   └── route.ts    # DELETE images
│           ├── reset/
│           │   └── route.ts    # POST reset votes
│           ├── export/
│           │   └── route.ts    # GET CSV export
│           └── download/
│               └── route.ts    # POST bulk download ZIP
├── lib/
│   ├── supabase/
│   │   ├── server.ts           # Server-side Supabase client
│   │   └── client.ts           # Browser-side Supabase client
│   └── admin-auth.ts           # Admin password check helpers
├── middleware.ts                # Protects /admin/dashboard and /api/admin/*
├── tailwind.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.local                  # Environment variables (not committed)
```

---

## Task 1: Project Scaffolding & Supabase Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local`, `.gitignore`, `postcss.config.mjs`
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd "/Users/kobi/Documents/Dev/Image Approver"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full project scaffolding.

- [ ] **Step 2: Install Supabase dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 3: Create `.env.local`**

Create `.env.local` with placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_PASSWORD=your_admin_password
```

- [ ] **Step 4: Create server-side Supabase client**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — safe to ignore
          }
        },
      },
    }
  )
}

// Admin client with service role key (bypasses RLS)
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}
```

- [ ] **Step 5: Create browser-side Supabase client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 6: Set up Supabase database tables**

Run these SQL commands in the Supabase SQL editor (or via MCP):

```sql
-- Images table
CREATE TABLE images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  storage_path text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Votes table
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  voter_name text NOT NULL,
  vote text NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (image_id, voter_name)
);

-- Index for fast lookups by voter
CREATE INDEX idx_votes_voter_name ON votes(voter_name);
CREATE INDEX idx_votes_image_id ON votes(image_id);
```

- [ ] **Step 7: Create Supabase Storage bucket**

Create a public bucket named `images` in Supabase Storage. Set it to public so images can be accessed via URL.

- [ ] **Step 8: Configure dark theme in root layout**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Image Feedback',
  description: 'Help us pick the best images',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 9: Update globals.css for dark theme base**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #030712;
  color: #f3f4f6;
}
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: App loads at localhost:3000 with dark background.

- [ ] **Step 11: Initialize git and commit**

```bash
git init
git add .
git commit -m "feat: project scaffolding with Next.js, Tailwind, Supabase clients"
```

---

## Task 2: Login Screen

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the login page**

Replace `src/app/page.tsx`:

```typescript
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
    localStorage.setItem('voterName', trimmed)
    router.push('/vote')
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold mb-2">Image Feedback</h1>
        <p className="text-gray-400 mb-8">Help us pick the best images</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-center text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Start Reviewing
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify login screen**

Run `npm run dev`, open localhost:3000. Should see dark background, centered form, name input, and button.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: login screen with name input"
```

---

## Task 3: Public API Routes (images, vote, voter-stats)

**Files:**
- Create: `src/app/api/images/route.ts`
- Create: `src/app/api/vote/route.ts`
- Create: `src/app/api/voter-stats/route.ts`

- [ ] **Step 1: Create GET /api/images route**

Create `src/app/api/images/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const voter = request.nextUrl.searchParams.get('voter')
  if (!voter) {
    return NextResponse.json({ error: 'voter param required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get all image IDs this voter has already voted on
  const { data: votedRows } = await supabase
    .from('votes')
    .select('image_id')
    .eq('voter_name', voter)

  const votedIds = (votedRows ?? []).map((r) => r.image_id)

  // Get total images count
  const { count: total } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true })

  // Get next unvoted image
  let query = supabase.from('images').select('id, url').limit(1)
  if (votedIds.length > 0) {
    query = query.not('id', 'in', `(${votedIds.join(',')})`)
  }
  const { data: images } = await query

  const image = images && images.length > 0 ? images[0] : null
  const remaining = (total ?? 0) - votedIds.length

  return NextResponse.json({ image, remaining, total: total ?? 0 })
}
```

- [ ] **Step 2: Create POST /api/vote route**

Create `src/app/api/vote/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { image_id, voter_name, vote } = body

  if (!image_id || !voter_name || !vote) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (vote !== 'approve' && vote !== 'reject') {
    return NextResponse.json({ error: 'Vote must be approve or reject' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase.from('votes').insert({
    image_id,
    voter_name: voter_name.trim(),
    vote,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already voted on this image' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create GET /api/voter-stats route**

Create `src/app/api/voter-stats/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const voter = request.nextUrl.searchParams.get('voter')
  if (!voter) {
    return NextResponse.json({ error: 'voter param required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: votes } = await supabase
    .from('votes')
    .select('vote')
    .eq('voter_name', voter)

  const all = votes ?? []
  const approved = all.filter((v) => v.vote === 'approve').length
  const rejected = all.filter((v) => v.vote === 'reject').length

  return NextResponse.json({
    total: all.length,
    approved,
    rejected,
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: public API routes for images, votes, and voter stats"
```

---

## Task 4: Voting Screen

**Files:**
- Create: `src/app/vote/page.tsx`

- [ ] **Step 1: Build the voting page**

Create `src/app/vote/page.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ImageData {
  id: string
  url: string
}

export default function VotePage() {
  const router = useRouter()
  const [voterName, setVoterName] = useState<string | null>(null)
  const [image, setImage] = useState<ImageData | null>(null)
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
    setRemaining(data.remaining)
    setTotal(data.total)
    setLoading(false)
    // Trigger fade-in after a brief delay
    requestAnimationFrame(() => setFadeIn(true))
  }, [router])

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
              src={image.url}
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
```

- [ ] **Step 2: Configure Next.js for external images**

Update `next.config.ts` to allow Supabase storage images:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 3: Verify voting screen**

Run `npm run dev`, enter a name on login, navigate to `/vote`. Should show loading state (no images in DB yet, so will redirect to `/done`).

- [ ] **Step 4: Commit**

```bash
git add src/app/vote/ next.config.ts
git commit -m "feat: voting screen with image display and approve/reject buttons"
```

---

## Task 5: Done Screen

**Files:**
- Create: `src/app/done/page.tsx`

- [ ] **Step 1: Build the done page**

Create `src/app/done/page.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/done/
git commit -m "feat: done screen with vote summary"
```

---

## Task 6: Admin Auth (Middleware + Login Page)

**Files:**
- Create: `src/lib/admin-auth.ts`
- Create: `src/middleware.ts`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create admin auth helpers**

Create `src/lib/admin-auth.ts`:

```typescript
import { cookies } from 'next/headers'

const ADMIN_COOKIE = 'admin_session'

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_COOKIE)
  return session?.value === process.env.ADMIN_PASSWORD
}

export function getAdminCookieName(): string {
  return ADMIN_COOKIE
}
```

- [ ] **Step 2: Create middleware**

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /admin/dashboard and /api/admin/*
  if (pathname.startsWith('/admin/dashboard') || pathname.startsWith('/api/admin')) {
    const session = request.cookies.get('admin_session')
    if (session?.value !== process.env.ADMIN_PASSWORD) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/api/admin/:path*'],
}
```

- [ ] **Step 3: Create admin login page**

Create `src/app/admin/page.tsx`:

```typescript
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

    // Set the cookie and try to access dashboard
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
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin-auth.ts src/middleware.ts src/app/admin/page.tsx
git commit -m "feat: admin auth with middleware and login page"
```

---

## Task 7: Admin API Routes

**Files:**
- Create: `src/app/api/admin/images/route.ts`
- Create: `src/app/api/admin/upload/route.ts`
- Create: `src/app/api/admin/delete/route.ts`
- Create: `src/app/api/admin/reset/route.ts`
- Create: `src/app/api/admin/export/route.ts`
- Create: `src/app/api/admin/download/route.ts`

- [ ] **Step 1: Install JSZip for bulk download**

```bash
npm install jszip
```

- [ ] **Step 2: Create GET /api/admin/images**

Create `src/app/api/admin/images/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  const { data: images } = await supabase
    .from('images')
    .select('id, filename, url, created_at')
    .order('created_at', { ascending: false })

  const { data: votes } = await supabase
    .from('votes')
    .select('image_id, vote')

  const allVotes = votes ?? []
  const imageList = (images ?? []).map((img) => {
    const imgVotes = allVotes.filter((v) => v.image_id === img.id)
    const approved = imgVotes.filter((v) => v.vote === 'approve').length
    const rejected = imgVotes.filter((v) => v.vote === 'reject').length
    const total = approved + rejected
    const approvalPct = total > 0 ? Math.round((approved / total) * 100) : null

    return { ...img, approved, rejected, total, approvalPct }
  })

  return NextResponse.json({ images: imageList })
}
```

- [ ] **Step 3: Create POST /api/admin/upload**

Create `src/app/api/admin/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const formData = await request.formData()
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  let uploaded = 0

  for (const file of files) {
    const ext = file.name.split('.').pop()
    const storagePath = `${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(storagePath, file)

    if (uploadError) continue

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(storagePath)

    await supabase.from('images').insert({
      filename: file.name,
      storage_path: storagePath,
      url: urlData.publicUrl,
    })

    uploaded++
  }

  return NextResponse.json({ uploaded })
}
```

- [ ] **Step 4: Create DELETE /api/admin/delete**

Create `src/app/api/admin/delete/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  const { image_ids } = await request.json()

  if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
    return NextResponse.json({ error: 'image_ids required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get storage paths before deleting DB records
  const { data: images } = await supabase
    .from('images')
    .select('storage_path')
    .in('id', image_ids)

  const paths = (images ?? []).map((i) => i.storage_path)

  // Delete from storage
  if (paths.length > 0) {
    await supabase.storage.from('images').remove(paths)
  }

  // Delete from DB (cascade deletes votes)
  const { count } = await supabase
    .from('images')
    .delete({ count: 'exact' })
    .in('id', image_ids)

  return NextResponse.json({ deleted: count ?? 0 })
}
```

- [ ] **Step 5: Create POST /api/admin/reset**

Create `src/app/api/admin/reset/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { image_ids } = await request.json()

  if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
    return NextResponse.json({ error: 'image_ids required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { count } = await supabase
    .from('votes')
    .delete({ count: 'exact' })
    .in('image_id', image_ids)

  return NextResponse.json({ reset: count ?? 0 })
}
```

- [ ] **Step 6: Create GET /api/admin/export**

Create `src/app/api/admin/export/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  const { data: votes } = await supabase
    .from('votes')
    .select('voter_name, vote, created_at, images(filename)')
    .order('created_at', { ascending: true })

  const rows = (votes ?? []).map((v: any) => ({
    image: v.images?.filename ?? 'unknown',
    voter: v.voter_name,
    vote: v.vote,
    date: v.created_at,
  }))

  const header = 'image_filename,voter_name,vote,voted_at'
  const csvRows = rows.map(
    (r) => `"${r.image}","${r.voter}","${r.vote}","${r.date}"`
  )
  const csv = [header, ...csvRows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="votes-export.csv"',
    },
  })
}
```

- [ ] **Step 7: Create POST /api/admin/download**

Create `src/app/api/admin/download/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import JSZip from 'jszip'

export async function POST(request: NextRequest) {
  const { image_ids } = await request.json()

  if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
    return NextResponse.json({ error: 'image_ids required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: images } = await supabase
    .from('images')
    .select('filename, storage_path')
    .in('id', image_ids)

  if (!images || images.length === 0) {
    return NextResponse.json({ error: 'No images found' }, { status: 404 })
  }

  const zip = new JSZip()

  for (const img of images) {
    const { data } = await supabase.storage
      .from('images')
      .download(img.storage_path)

    if (data) {
      const buffer = await data.arrayBuffer()
      zip.file(img.filename, buffer)
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

  return new Response(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="images.zip"',
    },
  })
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/api/admin/ package.json package-lock.json
git commit -m "feat: admin API routes for upload, delete, reset, export, download"
```

---

## Task 8: Admin Dashboard Page

**Files:**
- Create: `src/app/admin/dashboard/page.tsx`

This is the largest component. It includes: image table, filter bar, bulk actions, upload modal, and all admin interactions.

- [ ] **Step 1: Build the admin dashboard**

Create `src/app/admin/dashboard/page.tsx`:

```typescript
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

  // Filter logic
  const filtered = images.filter((img) => {
    if (filter === 'all') return true
    if (filter === 'none') return img.total === 0
    if (filter === 'gte80') return img.approvalPct !== null && img.approvalPct >= 80
    if (filter === 'gte60') return img.approvalPct !== null && img.approvalPct >= 60
    if (filter === 'lt50') return img.approvalPct !== null && img.approvalPct < 50
    return true
  })

  // Sort by approval %
  const sorted = [...filtered].sort((a, b) => {
    const aVal = a.approvalPct ?? -1
    const bVal = b.approvalPct ?? -1
    return sortAsc ? aVal - bVal : bVal - aVal
  })

  const totalVotes = images.reduce((sum, img) => sum + img.total, 0)

  // Selection handlers
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

  // Upload handler
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

  // Bulk actions
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

  // Per-row actions
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

  // Drag-and-drop
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
                      src={img.url}
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
```

- [ ] **Step 2: Verify admin dashboard loads**

Run `npm run dev`, go to `/admin`, enter password, verify dashboard renders.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/dashboard/
git commit -m "feat: admin dashboard with table, filters, bulk actions, upload modal"
```

---

## Task 9: End-to-End Testing & Polish

**Files:**
- Possibly minor tweaks to existing files

- [ ] **Step 1: Test full user flow**

1. Start dev server: `npm run dev`
2. Go to `/admin`, log in, upload 3-4 test images
3. Open `/` in a new tab, enter a name, vote on all images
4. Verify redirect to `/done` with correct summary stats
5. Go back to admin dashboard, verify vote counts updated

- [ ] **Step 2: Test admin features**

1. Filter by approval % — verify correct images shown
2. Select multiple images, click Download — verify ZIP downloads
3. Select an image, click Reset Votes — verify counts go to 0
4. Upload multiple images at once via drag-and-drop
5. Export CSV — verify file downloads with correct data
6. Delete an image — verify it's removed from table and storage

- [ ] **Step 3: Test duplicate vote prevention**

1. Try voting on the same image with the same name (e.g., via direct API call)
2. Should return 409 error

- [ ] **Step 4: Test with second voter**

1. Open in incognito/different browser
2. Enter a different name
3. Verify they see all images (not affected by first voter)

- [ ] **Step 5: Fix any issues found during testing**

Address any bugs discovered.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish and bug fixes from e2e testing"
```

---

## Task 10: Vercel Deployment Setup

**Files:**
- Create: `vercel.json` (if needed)
- Update: `.gitignore`

- [ ] **Step 1: Ensure .gitignore is correct**

Verify `.gitignore` includes:
```
.env.local
.env*.local
node_modules/
.next/
.superpowers/
```

- [ ] **Step 2: Push to GitHub**

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

- [ ] **Step 3: Connect to Vercel**

1. Go to vercel.com, import the GitHub repo
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
3. Deploy

- [ ] **Step 4: Verify production deployment**

1. Open deployed URL
2. Test login → vote → done flow
3. Test admin panel at `/admin`

- [ ] **Step 5: Commit any deployment config**

```bash
git add .
git commit -m "chore: deployment configuration"
```
