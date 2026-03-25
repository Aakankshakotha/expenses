/**
 * POST /api/auth/refresh
 *
 * Uses the stored HTTP-only refresh token to silently obtain a new access token
 * from Google, then updates the drive token cookie.
 *
 * Returns { ok: true } on success, or { error, code: 'REFRESH_FAILED' } when
 * the refresh token is missing or has been revoked — in which case the client
 * must prompt the user to sign in again.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('moneyflow_refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'No refresh token available', code: 'REFRESH_FAILED' },
      { status: 401 }
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    )
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!tokenRes.ok) {
    // Refresh token revoked or expired — clear both cookies
    const response = NextResponse.json(
      {
        error: 'Session expired. Please sign in again.',
        code: 'REFRESH_FAILED',
      },
      { status: 401 }
    )
    response.cookies.set('moneyflow_drive_token', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    })
    response.cookies.set('moneyflow_refresh_token', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    })
    return response
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string
    expires_in?: number
    error?: string
  }

  if (tokenData.error) {
    return NextResponse.json(
      { error: tokenData.error, code: 'REFRESH_FAILED' },
      { status: 401 }
    )
  }

  const { access_token, expires_in = 3600 } = tokenData

  const response = NextResponse.json({ ok: true })

  // Replace the access token cookie with the refreshed one
  const maxAge = Math.max(expires_in - 300, 0)
  response.cookies.set('moneyflow_drive_token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  })

  return response
}
