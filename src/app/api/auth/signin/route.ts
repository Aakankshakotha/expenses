/**
 * POST /api/auth/signin
 *
 * Exchanges a Google OAuth authorization code for an access token server-side,
 * then stores the token in an HTTP-only cookie so it is never exposed to
 * client-side JavaScript.
 *
 * Security: The GOOGLE_CLIENT_SECRET never leaves the server.
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { code?: unknown }
  const code = body.code

  if (typeof code !== 'string' || !code) {
    return NextResponse.json(
      { error: 'Missing authorization code' },
      { status: 400 }
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars')
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    )
  }

  // Exchange authorization code for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'postmessage', // Required for popup-based OAuth flows
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('Token exchange failed:', err)
    return NextResponse.json(
      { error: 'Failed to exchange authorization code' },
      { status: 400 }
    )
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
    error?: string
  }

  if (tokenData.error) {
    return NextResponse.json({ error: tokenData.error }, { status: 400 })
  }

  const grantedScopes = tokenData.scope?.split(' ') ?? []
  const hasDriveFileScope = grantedScopes.includes(
    'https://www.googleapis.com/auth/drive.file'
  )
  if (!hasDriveFileScope) {
    return NextResponse.json(
      {
        error:
          'Google Drive permission was not granted. Please sign in again and approve Drive access.',
        code: 'INSUFFICIENT_SCOPE',
        requiredScope: 'https://www.googleapis.com/auth/drive.file',
      },
      { status: 403 }
    )
  }

  const { access_token, refresh_token, expires_in = 3600 } = tokenData

  // Fetch user profile server-side using the access token
  const profileRes = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      headers: { Authorization: `Bearer ${access_token}` },
    }
  )

  if (!profileRes.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 400 }
    )
  }

  const profile = (await profileRes.json()) as {
    name: string
    email: string
    picture: string
  }

  const user = {
    name: profile.name,
    email: profile.email,
    picture: profile.picture,
  }

  const response = NextResponse.json({ user })

  // Store access token in HTTP-only cookie — never readable by JavaScript
  const maxAge = Math.max(expires_in - 300, 0) // 5-minute buffer
  response.cookies.set('moneyflow_drive_token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  })

  // Store refresh token if provided (also HTTP-only; no expiry — valid until revoked)
  if (refresh_token) {
    response.cookies.set('moneyflow_refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
  }

  return response
}
