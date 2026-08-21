'use client'

import React, { useEffect } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { MuiAppThemeProvider } from '@/theme/MuiAppThemeProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import LoginPage from '@/views/LoginPage'

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''

/**
 * Auth-aware application shell.
 * - Shows loading spinner while session is being verified.
 * - Shows login page when unauthenticated.
 * - Listens for 'moneyflow:token-expired' DOM events dispatched by the Drive
 *   service and silently attempts a token refresh; if that fails it signs out.
 */
function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, handleTokenExpired } = useAuth()

  useEffect(() => {
    const onTokenExpired = () => {
      handleTokenExpired().catch(() => {
        // handleTokenExpired already clears session on failure — nothing else needed
      })
    }
    window.addEventListener('moneyflow:token-expired', onTokenExpired)
    return () =>
      window.removeEventListener('moneyflow:token-expired', onTokenExpired)
  }, [handleTokenExpired])

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <Navigation />
      <Box component="main" sx={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {children}
      </Box>
    </Box>
  )
}

/**
 * Client-side providers wrapper.
 * All providers must be client-side due to React context and browser APIs.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ThemeProvider>
        <MuiAppThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </MuiAppThemeProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
