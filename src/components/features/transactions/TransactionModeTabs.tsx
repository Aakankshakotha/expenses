'use client'

import React from 'react'
import Box from '@mui/material/Box'
import type { EntryMode } from '@/hooks/useTransactionForm'

const MODES: { id: EntryMode; label: string }[] = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
]

interface TransactionModeTabsProps {
  entryMode: EntryMode
  onChange: (mode: EntryMode) => void
}

export const TransactionModeTabs: React.FC<TransactionModeTabsProps> = ({
  entryMode,
  onChange,
}) => (
  <Box sx={{ display: 'flex', gap: '0.5rem' }}>
    {MODES.map(({ id, label }) => {
      const isActive = entryMode === id
      return (
        <Box
          key={id}
          component="button"
          type="button"
          onClick={() => onChange(id)}
          sx={{
            flex: 1,
            py: '0.5rem',
            px: '0.75rem',
            border: '1.5px solid',
            borderColor: isActive ? '#1e293b' : '#d1d5db',
            borderRadius: '0.5rem',
            background: 'transparent',
            fontSize: '0.9rem',
            fontWeight: isActive ? 700 : 400,
            color: isActive ? '#1e293b' : '#6b7280',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            '&:hover': {
              borderColor: '#1e293b',
              color: '#1e293b',
            },
          }}
        >
          {label}
        </Box>
      )
    })}
  </Box>
)
