import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function verifySessionToken(token: string): boolean {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  const expected = crypto.createHmac('sha256', secret).update('admin_session_v1').digest('hex')
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow login/logout without auth
  if (pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin/dashboard') || pathname.startsWith('/api/admin')) {
    const session = request.cookies.get('admin_session')
    if (!session?.value || !verifySessionToken(session.value)) {
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
