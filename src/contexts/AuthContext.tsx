/**
 * AuthContext
 * Handles Google OAuth2 sign-in using the authorization code flow.
 *
 * Security model:
 * - The Google authorization code is exchanged for an access token server-side
 *   via /api/auth/signin, so the token is NEVER exposed to client JavaScript.
 * - The token is stored in an HTTP-only cookie managed by the Next.js server.
 * - Session is restored on mount by calling /api/auth/me, which verifies the
 *   cookie against Google's userinfo endpoint server-side.
 * - All Google Drive API calls are proxied through /api/drive/** — the browser
 *   never holds or transmits the access token directly.
 */
'use client'

import React, { createContext, useCallback, useEffect, useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import {
  initializeDriveStorage,
  clearDriveStorage,
} from '@/services/storageService'

// ── Types ────────────────────────────────────────────────────────────────────

export interface GoogleUser {
  name: string
  email: string
  picture: string
}

interface AuthContextValue {
  user: GoogleUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: () => void
  signOut: () => void
  /**
   * Called when the Drive proxy returns { code: 'TOKEN_EXPIRED' }.
   * Attempts a silent token refresh first; if that fails, clears the session
   * so the login screen is shown.
   */
  handleTokenExpired: () => Promise<boolean>
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)
export { AuthContext }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session on mount by verifying the HTTP-only cookie server-side
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data: { user: GoogleUser | null }) => {
        if (data.user) {
          initializeDriveStorage()
          setUser(data.user)
        }
      })
      .catch(() => {
        /* network error — treat as unauthenticated */
      })
      .finally(() => setIsLoading(false))
  }, [])

  /**
   * Attempts a silent token refresh via /api/auth/refresh.
   * Returns true if the refresh succeeded (caller can retry the operation),
   * false if the user must sign in again.
   */
  const handleTokenExpired = useCallback(async (): Promise<boolean> => {
    const res = await fetch('/api/auth/refresh', { method: 'POST' })
    if (res.ok) {
      // New access token is now in the drive cookie — nothing else to update
      return true
    }
    // Refresh failed — clear session and show login
    await fetch('/api/auth/signout', { method: 'POST' })
    clearDriveStorage()
    setUser(null)
    return false
  }, [])

  const signOut = useCallback(async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    clearDriveStorage()
    setUser(null)
  }, [])

  /**
   * Authorization code flow — the code is sent to /api/auth/signin which
   * exchanges it for an access token server-side and stores it in an
   * HTTP-only cookie. The browser never sees the access token.
   */
  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    // Include identity scopes explicitly so tokens always include Drive access.
    scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
    include_granted_scopes: true,
    select_account: true,
    onSuccess: async ({ code }) => {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      if (!res.ok) {
        console.error('Sign-in failed:', await res.text())
        return
      }

      const data = (await res.json()) as { user: GoogleUser }
      initializeDriveStorage()
      setUser(data.user)
    },
    onError: (error) => {
      console.error('Google sign-in failed:', error)
    },
  })

  const signIn = useCallback(() => {
    googleLogin()
  }, [googleLogin])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        signIn,
        signOut,
        handleTokenExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export type { AuthContextValue }
