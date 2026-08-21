'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import { useRouter } from 'next/navigation'
import type { TransactionWithAccounts } from '@/types/transaction'
import { formatCurrency } from '@/utils/currencyUtils'
import { useTheme, alpha } from '@mui/material/styles'

interface RecentTransactionsListProps {
  transactions: TransactionWithAccounts[]
  limit?: number
}

const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  limit = 8,
}) => {
  const router = useRouter()
  const theme = useTheme()

  const sorted = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)

  const getTransactionInfo = (txn: TransactionWithAccounts) => {
    const isIncome = txn.fromAccount.type === 'income'
    const isExpense = txn.toAccount.type === 'expense'
    const amount = isIncome ? txn.amount : isExpense ? -txn.amount : txn.amount
    const accountLabel = isIncome ? txn.toAccount.name : txn.fromAccount.name
    const date = new Date(txn.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return { isIncome, isExpense, amount, accountLabel, date }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        p: '1.5rem',
        backgroundColor: 'background.paper',
        height: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: '1.25rem',
        }}
      >
        <Typography
          sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}
        >
          Recent Transactions
        </Typography>
        <Typography
          component="span"
          onClick={() => router.push('/transactions')}
          sx={{
            fontSize: '0.8rem',
            color: 'primary.main',
            cursor: 'pointer',
            fontWeight: 500,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          View all
        </Typography>
      </Box>

      {sorted.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: '3rem',
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: '2rem' }}>📭</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            No transactions yet
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {sorted.map((txn, idx) => {
            const { isIncome, amount, accountLabel, date } =
              getTransactionInfo(txn)
            const amountColor = isIncome
              ? theme.palette.success.main
              : theme.palette.error.main
            const iconBg = isIncome
              ? alpha(theme.palette.success.main, 0.12)
              : alpha(theme.palette.error.main, 0.12)
            const iconColor = isIncome
              ? theme.palette.success.main
              : theme.palette.error.main

            return (
              <Box
                key={txn.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  py: '0.75rem',
                  borderTop: idx === 0 ? 'none' : '1px solid',
                  borderTopColor: 'divider',
                }}
              >
                {/* Icon circle */}
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '1rem',
                    color: iconColor,
                    fontWeight: 700,
                  }}
                >
                  {isIncome ? '↑' : '↓'}
                </Box>

                {/* Name + date/account */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'text.primary',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {txn.description || txn.toAccount.name}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                  >
                    {date} · {accountLabel}
                  </Typography>
                </Box>

                {/* Amount */}
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: amountColor,
                    flexShrink: 0,
                  }}
                >
                  {amount >= 0 ? '+' : ''}
                  {formatCurrency(amount)}
                </Typography>
              </Box>
            )
          })}
        </Box>
      )}
    </Paper>
  )
}

export default RecentTransactionsList
