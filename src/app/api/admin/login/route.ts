import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken } from '@/lib/admin-auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const expected = process.env.ADMIN_PASSWORD ?? ''
  const a = Buffer.from(password)
  const b = Buffer.from(expected)

  // Constant-time comparison to prevent timing attacks
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b)

  if (!valid) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const token = createSessionToken()

  const res = NextResponse.json({ success: true })
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return res
}
