import { NextRequest, NextResponse } from 'next/server'

async function computeHmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function verifySessionToken(token: string): Promise<boolean> {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  const expected = await computeHmac(secret, 'admin_session_v1')
  return timingSafeEqual(token, expected)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow login/logout without auth
  if (pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin/dashboard') || pathname.startsWith('/api/admin')) {
    const session = request.cookies.get('admin_session')
    if (!session?.value || !(await verifySessionToken(session.value))) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // CSRF: verify Origin header on state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const origin = request.headers.get('origin')
      const host = request.headers.get('host')
      if (origin && host && !origin.endsWith(host)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/api/admin/:path*'],
}
