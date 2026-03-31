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
