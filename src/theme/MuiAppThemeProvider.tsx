'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material'
import { useTheme as useAppTheme } from '@/contexts/ThemeContext'

interface MuiAppThemeProviderProps {
  children: ReactNode
}

export function MuiAppThemeProvider({
  children,
}: MuiAppThemeProviderProps): JSX.Element {
  const { theme } = useAppTheme()

  const isDark = theme === 'dark'

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: theme,
          primary: {
            main: '#1e293b',
            dark: '#0f172a',
            light: '#334155',
            contrastText: '#ffffff',
          },
          secondary: {
            main: isDark ? '#8a8a92' : '#6b7280',
            dark: isDark ? '#6b7280' : '#4b5563',
            light: isDark ? '#b3b3b8' : '#9ca3af',
            contrastText: '#ffffff',
          },
          error: {
            main: isDark ? '#f87171' : '#dc2626',
            light: isDark ? '#fca5a5' : '#ef4444',
            dark: isDark ? '#ef4444' : '#b91c1c',
            contrastText: '#ffffff',
          },
          success: {
            main: isDark ? '#4ade80' : '#16a34a',
            light: isDark ? '#86efac' : '#22c55e',
            dark: isDark ? '#22c55e' : '#15803d',
            contrastText: '#ffffff',
          },
          warning: {
            main: isDark ? '#fbbf24' : '#d97706',
            light: isDark ? '#fcd34d' : '#f59e0b',
            dark: isDark ? '#f59e0b' : '#b45309',
            contrastText: '#ffffff',
          },
          info: {
            main: isDark ? '#38bdf8' : '#0284c7',
            light: isDark ? '#7dd3fc' : '#0ea5e9',
            dark: isDark ? '#0ea5e9' : '#0369a1',
            contrastText: '#ffffff',
          },
          background: {
            default: isDark ? '#0b0f1a' : '#f1f5f9',
            paper: isDark ? '#141b2d' : '#ffffff',
          },
          text: {
            primary: isDark ? '#f1f5f9' : '#1e293b',
            secondary: isDark ? '#94a3b8' : '#64748b',
            disabled: isDark ? '#334155' : '#cbd5e1',
          },
          divider: isDark ? '#1e293b' : '#e2e8f0',
          sidebar: {
            bg: '#0d1b2a',
            text: '#94a3b8',
            border: 'rgba(255,255,255,0.06)',
            hover: 'rgba(255,255,255,0.07)',
            accent: isDark ? '#34d399' : '#10b981',
          },
          charts: {
            categorical: [
              '#14b8a6',
              '#8b5cf6',
              '#ec4899',
              '#6366f1',
              '#06b6d4',
              '#a855f7',
              '#84cc16',
              '#fb7185',
              '#ff5a3c',
              '#ff2f7d',
              '#2ec4b6',
            ],
          },
        },
        shape: {
          borderRadius: 10,
        },
        typography: {
          fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
          button: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
        components: {
          MuiButton: {
            defaultProps: {
              disableElevation: true,
            },
            styleOverrides: {
              root: {
                borderRadius: 10,
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' },
              },
              containedPrimary: {
                '&:hover': {
                  backgroundColor: '#0f172a',
                },
              },
              outlinedPrimary: {
                borderColor: '#1e293b',
                '&:hover': {
                  backgroundColor: 'rgba(30,41,59,0.08)',
                },
              },
            },
          },
          MuiTextField: {
            defaultProps: {
              size: 'small',
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              notchedOutline: {
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
                transition: 'border-color 0.15s ease',
              },
              root: {
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? '#334155' : '#cbd5e1',
                },
              },
            },
          },
          MuiInputLabel: {
            styleOverrides: {
              root: {
                color: isDark ? '#b3b3b8' : '#6b7280',
                fontSize: '0.875rem',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                fontWeight: 500,
                fontSize: '0.75rem',
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                borderRadius: 10,
              },
            },
          },
          MuiDivider: {
            styleOverrides: {
              root: {
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
              },
            },
          },
        },
      }),
    [theme, isDark] // isDark is derived from theme; both listed for explicitness
  )

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}
