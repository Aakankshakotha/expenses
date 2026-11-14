'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import PieChartOutlineOutlinedIcon from '@mui/icons-material/PieChartOutlineOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined'

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', Icon: GridViewOutlinedIcon, exact: true },
  {
    href: '/accounts',
    label: 'Accounts',
    Icon: AccountBalanceWalletOutlinedIcon,
    exact: false,
  },
  {
    href: '/transactions',
    label: 'Transactions',
    Icon: ReceiptLongOutlinedIcon,
    exact: false,
  },
  {
    href: '/recurring',
    label: 'Recurring',
    Icon: RepeatOutlinedIcon,
    exact: false,
  },
  {
    href: '/budgets',
    label: 'Budgets',
    Icon: PieChartOutlineOutlinedIcon,
    exact: false,
  },
  {
    href: '/categories',
    label: 'Categories',
    Icon: CategoryOutlinedIcon,
    exact: false,
  },
  {
    href: '/settings',
    label: 'Backup',
    Icon: BackupOutlinedIcon,
    exact: false,
  },
]

/**
 * Main navigation component — vertical sidebar
 */
const Navigation: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()

  return (
    <Box
      component="nav"
      sx={{
        width: '220px',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        backgroundColor: 'sidebar.bg',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: '1.25rem',
          py: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid',
          borderBottomColor: 'sidebar.border',
          mb: '0.5rem',
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            backgroundColor: 'sidebar.accent',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShowChartIcon sx={{ color: '#fff', fontSize: '1.1rem' }} />
        </Box>
        <Typography
          sx={{
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '-0.01em',
          }}
        >
          FinanceFlow
        </Typography>
      </Box>

      {/* Nav links */}
      <Box
        sx={{
          flex: 1,
          px: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.125rem',
        }}
      >
        {NAV_LINKS.map(({ href, label, Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  px: '0.875rem',
                  py: '0.625rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isActive ? 'sidebar.accent' : 'transparent',
                  color: isActive ? 'primary.contrastText' : 'sidebar.text',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    backgroundColor: isActive
                      ? 'sidebar.accent'
                      : 'sidebar.hover',
                    color: 'common.white',
                  },
                }}
              >
                <Icon sx={{ fontSize: '1.125rem', flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                    lineHeight: 1.4,
                  }}
                >
                  {label}
                </Typography>
              </Box>
            </Link>
          )
        })}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: '1.25rem',
          py: '1.25rem',
          borderTop: '1px solid',
          borderTopColor: 'sidebar.border',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{ fontSize: '0.6875rem', color: 'sidebar.text', opacity: 0.6 }}
        >
          Personal Finance Tracker
        </Typography>
        <IconButton
          onClick={toggleTheme}
          size="small"
          aria-label="Toggle theme"
          sx={{
            width: 30,
            height: 30,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: '6px',
            color: 'sidebar.text',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.14)',
              color: '#fff',
            },
          }}
        >
          {theme === 'light' ? (
            <DarkModeIcon sx={{ fontSize: '0.9rem' }} />
          ) : (
            <LightModeIcon sx={{ fontSize: '0.9rem' }} />
          )}
        </IconButton>
      </Box>
    </Box>
  )
}

export default Navigation
