/**
 * Google Drive API proxy
 *
 * All Google Drive API calls are proxied through here instead of being made
 * directly from the browser. The access token is read from an HTTP-only cookie
 * and is NEVER exposed to client-side JavaScript.
 *
 * Routes:
 *   /api/drive/v3/[...path]        → https://www.googleapis.com/drive/v3/[...path]
 *   /api/drive/upload/v3/[...path] → https://www.googleapis.com/upload/drive/v3/[...path]
 *
 * Token refresh: on a 401 from Google, the proxy attempts a silent token refresh
 * using the stored refresh token cookie, then retries the original request once.
 * If the refresh also fails, { code: 'TOKEN_EXPIRED' } is returned to the client
 * which then prompts re-authentication.
 *
 * SSRF protection: only googleapis.com/drive paths are allowed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ALLOWED_HOST = 'www.googleapis.com'
const ALLOWED_PATH_PREFIXES = ['/drive', '/upload/drive']

/** Attempt a silent token refresh. Returns the new access token or null. */
async function tryRefreshToken(): Promise<{
  token: string
  maxAge: number
} | null> {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('moneyflow_refresh_token')?.value
  if (!refreshToken) return null

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

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

  if (!tokenRes.ok) return null

  const data = (await tokenRes.json()) as {
    access_token?: string
    expires_in?: number
  }
  if (!data.access_token) return null

  return {
    token: data.access_token,
    maxAge: Math.max((data.expires_in ?? 3600) - 300, 0),
  }
}

async function callDriveApi(
  driveUrl: string,
  method: string,
  token: string,
  contentType: string | null,
  body: ArrayBuffer | undefined
): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (contentType) headers['Content-Type'] = contentType
  return fetch(driveUrl, { method, headers, body })
}

async function proxyDriveRequest(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const cookieStore = await cookies()
  let token = cookieStore.get('moneyflow_drive_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Reconstruct the target Google Drive URL.
  // /api/drive/v3/*        -> https://www.googleapis.com/drive/v3/*
  // /api/drive/upload/v3/* -> https://www.googleapis.com/upload/drive/v3/*
  const [first, ...rest] = pathSegments
  let drivePath =
    first === 'upload'
      ? `/upload/drive/${rest.join('/')}`
      : `/drive/${pathSegments.join('/')}`

  // Defensive normalization: if any caller accidentally sends /drive/upload/*,
  // rewrite to the canonical Google upload path.
  if (drivePath.startsWith('/drive/upload/')) {
    drivePath = drivePath.replace('/drive/upload/', '/upload/drive/')
  }

  const search = request.nextUrl.search
  const driveUrl = `https://${ALLOWED_HOST}${drivePath}${search}`

  console.log(
    `[drive-proxy] ${request.method} /api/drive/${pathSegments.join('/')} -> ${drivePath}`
  )

  // SSRF guard: validate the reconstructed URL strictly
  let parsedUrl: URL
  try {
    parsedUrl = new URL(driveUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid request path' }, { status: 400 })
  }

  if (
    parsedUrl.hostname !== ALLOWED_HOST ||
    !ALLOWED_PATH_PREFIXES.some((prefix) =>
      parsedUrl.pathname.startsWith(prefix)
    )
  ) {
    return NextResponse.json({ error: 'Forbidden target' }, { status: 403 })
  }

  const contentType = request.headers.get('Content-Type')

  // Read body once — needed for potential retry after token refresh
  let body: ArrayBuffer | undefined
  if (['POST', 'PATCH', 'PUT'].includes(request.method)) {
    body = await request.arrayBuffer()
  }

  let upstreamRes = await callDriveApi(
    driveUrl,
    request.method,
    token,
    contentType,
    body
  )

  // Log non-OK upstream errors for debugging
  if (!upstreamRes.ok && upstreamRes.status !== 401) {
    console.error(
      `[drive-proxy] ${request.method} ${driveUrl} → ${upstreamRes.status}`
    )
    const errText = await upstreamRes.clone().text()
    console.error('[drive-proxy] Error body:', errText.slice(0, 500))
  }

  // On 401: attempt a silent token refresh and retry once
  if (upstreamRes.status === 401) {
    const refreshed = await tryRefreshToken()

    if (!refreshed) {
      // No refresh token available or refresh failed — prompt re-login
      const response = NextResponse.json(
        {
          error: 'Google session expired. Please sign in again.',
          code: 'TOKEN_EXPIRED',
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

    // Retry the Drive request with the new token
    token = refreshed.token
    upstreamRes = await callDriveApi(
      driveUrl,
      request.method,
      token,
      contentType,
      body
    )

    if (upstreamRes.status === 401) {
      // Retry also failed — clear session
      const response = NextResponse.json(
        {
          error: 'Google session expired. Please sign in again.',
          code: 'TOKEN_EXPIRED',
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

    // Retry succeeded — persist the new access token in the cookie
    const responseBody = await upstreamRes.arrayBuffer()
    const responseContentType =
      upstreamRes.headers.get('Content-Type') ?? 'application/json'
    const response = new NextResponse(responseBody, {
      status: upstreamRes.status,
      headers: { 'Content-Type': responseContentType },
    })
    response.cookies.set('moneyflow_drive_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshed.maxAge,
      path: '/',
    })
    return response
  }

  const responseBody = await upstreamRes.arrayBuffer()
  const responseContentType =
    upstreamRes.headers.get('Content-Type') ?? 'application/json'

  return new NextResponse(responseBody, {
    status: upstreamRes.status,
    headers: { 'Content-Type': responseContentType },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyDriveRequest(request, path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyDriveRequest(request, path)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyDriveRequest(request, path)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyDriveRequest(request, path)
}
