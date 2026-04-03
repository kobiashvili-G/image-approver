import { cookies } from 'next/headers'
import crypto from 'crypto'

const ADMIN_COOKIE = 'admin_session'

/** Derive a session token from the admin password using HMAC — never store the raw password */
export function createSessionToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHmac('sha256', secret).update('admin_session_v1').digest('hex')
}

/** Verify the session cookie matches the expected HMAC token */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_COOKIE)
  if (!session?.value) return false

  const expected = createSessionToken()
  const a = Buffer.from(session.value)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function getAdminCookieName(): string {
  return ADMIN_COOKIE
}
