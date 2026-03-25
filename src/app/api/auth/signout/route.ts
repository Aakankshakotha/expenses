/**
 * POST /api/auth/signout
 *
 * Clears the HTTP-only drive token cookie, effectively signing the user out.
 */
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  // Clear the HTTP-only token cookie
  response.cookies.set('moneyflow_drive_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
