/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user by verifying the HTTP-only token cookie
 * against Google's userinfo endpoint. Returns null if not authenticated or the
 * token has expired.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface GoogleUserInfo {
  name: string
  email: string
  picture: string
}

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('moneyflow_drive_token')?.value

  if (!token) {
    return NextResponse.json({ user: null })
  }

  // Verify token is still valid by fetching user info
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    // Token expired or invalid — clear it
    const response = NextResponse.json({ user: null })
    response.cookies.set('moneyflow_drive_token', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    })
    return response
  }

  const profile = (await res.json()) as GoogleUserInfo

  return NextResponse.json({
    user: {
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
    },
  })
}
