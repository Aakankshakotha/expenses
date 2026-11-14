'use client'

import React from 'react'
import Box from '@mui/material/Box'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { MuiAppThemeProvider } from '@/theme/MuiAppThemeProvider'
import Navigation from '@/components/Navigation'
import { RecurringCatchUp } from '@/components/RecurringCatchUp'

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }}>
      <Navigation />
      <Box component="main" sx={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <RecurringCatchUp>{children}</RecurringCatchUp>
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
    <ThemeProvider>
      <MuiAppThemeProvider>
        <AppShell>{children}</AppShell>
      </MuiAppThemeProvider>
    </ThemeProvider>
  )
}
