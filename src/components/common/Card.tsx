'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'style'> {
  children: ReactNode
  title?: string
  subtitle?: string
  footer?: ReactNode
  noPadding?: boolean
  hoverable?: boolean
  sx?: SxProps<Theme>
}

export function Card({
  children,
  title,
  subtitle,
  footer,
  noPadding = false,
  hoverable = true,
  sx: sxProp,
  className = '',
  ...rest
}: CardProps) {
  const rootClass = [
    'card',
    hoverable ? 'card-hoverable' : '',
    noPadding ? 'card-no-padding' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Paper
      component="article"
      elevation={0}
      className={rootClass || undefined}
      sx={[
        {
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '0.5rem',
          backgroundColor: 'background.paper',
          transition: 'all 0.2s ease',
          boxShadow: 2,
          overflow: 'hidden',
          ...(hoverable && {
            '&:hover': {
              boxShadow: 4,
              borderColor: 'divider',
            },
          }),
        },
        ...(Array.isArray(sxProp) ? sxProp : sxProp ? [sxProp] : []),
      ]}
      {...rest}
    >
      {title && (
        <Box
          className="card-header"
          sx={{
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderBottomColor: 'divider',
          }}
        >
          <Typography
            component="h3"
            variant="h6"
            sx={{ m: 0, fontWeight: 600, color: 'text.primary' }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{ mt: '0.25rem', color: 'text.secondary' }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
      <Box className="card-body" sx={{ p: noPadding ? 0 : 3 }}>
        {children}
      </Box>
      {footer && (
        <Box
          className="card-footer"
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderTopColor: 'divider',
            background: 'action.selected',
          }}
        >
          {footer}
        </Box>
      )}
    </Paper>
  )
}
