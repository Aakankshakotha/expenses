'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import GoogleIcon from '@mui/icons-material/Google'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import StorageIcon from '@mui/icons-material/Storage'
import { useAuth } from '@/hooks/useAuth'

const LoginPage: React.FC = () => {
  const { signIn } = useAuth()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.5)'
              : '0 8px 32px rgba(0,0,0,0.08)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo + title */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800 }}>
                M
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              MoneyFlow
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your personal finance tracker
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Sign-in button */}
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={signIn}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              py: 1.4,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ my: 3 }} />

          {/* Privacy notes */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <StorageIcon
                fontSize="small"
                sx={{ color: 'primary.main', mt: 0.2, flexShrink: 0 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                lineHeight={1.5}
              >
                Your data is stored in your own Google Drive — in a{' '}
                <strong>MoneyFlow/</strong> folder. We never store your data on
                any server.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <LockOutlinedIcon
                fontSize="small"
                sx={{ color: 'success.main', mt: 0.2, flexShrink: 0 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                lineHeight={1.5}
              >
                We only request access to files created by this app. Your other
                Drive files remain private.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default LoginPage
