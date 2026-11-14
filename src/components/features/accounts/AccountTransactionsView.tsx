'use client'

import React, { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { formatCurrency } from '@/utils/currencyUtils'
import { getCategoryById } from '@/constants/categories'
import type { Account } from '@/types/account'
import type { TransactionWithAccounts } from '@/types/transaction'
import { formatDate } from '@/utils/dateUtils'

interface AccountTransactionsViewProps {
  account: Account
  transactions: TransactionWithAccounts[]
  onBack: () => void
  onEditTransaction?: (txn: TransactionWithAccounts) => void
  onDeleteTransaction?: (txn: TransactionWithAccounts) => void
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

interface TxnRowMenuProps {
  txn: TransactionWithAccounts
  onEdit?: (txn: TransactionWithAccounts) => void
  onDelete?: (txn: TransactionWithAccounts) => void
}

const TxnRowMenu: React.FC<TxnRowMenuProps> = ({ txn, onEdit, onDelete }) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
      >
        <MoreVertIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: { elevation: 2, sx: { borderRadius: '10px', minWidth: 130 } },
        }}
      >
        {onEdit && (
          <MenuItem
            onClick={() => {
              setAnchor(null)
              onEdit(txn)
            }}
          >
            <EditIcon
              fontSize="small"
              sx={{ mr: 1, color: 'text.secondary' }}
            />
            Edit
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem
            onClick={() => {
              setAnchor(null)
              onDelete(txn)
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export const AccountTransactionsView: React.FC<
  AccountTransactionsViewProps
> = ({
  account,
  transactions,
  onBack,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-indexed

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else setViewMonth((m) => m + 1)
  }

  // Filter transactions for this account and month
  const monthTxns = useMemo(() => {
    return transactions
      .filter((txn) => {
        const d = new Date(txn.date + 'T00:00:00')
        return (
          (txn.fromAccountId === account.id ||
            txn.toAccountId === account.id) &&
          d.getMonth() === viewMonth &&
          d.getFullYear() === viewYear
        )
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, account.id, viewMonth, viewYear])

  // Period net change for this account
  const periodChange = useMemo(() => {
    return monthTxns.reduce((sum, txn) => {
      if (txn.toAccountId === account.id) return sum + txn.amount
      return sum - txn.amount
    }, 0)
  }, [monthTxns, account.id])

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, TransactionWithAccounts[]> = {}
    monthTxns.forEach((txn) => {
      if (!map[txn.date]) map[txn.date] = []
      map[txn.date].push(txn)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [monthTxns])

  // Running balance per date group (from current balance going back)
  const dateBalances = useMemo(() => {
    // Start from current account balance and walk backward through sorted dates
    const result: Record<string, number> = {}
    let running = account.balance
    const sortedDates = [...grouped]
      .map(([date]) => date)
      .sort((a, b) => b.localeCompare(a))
    sortedDates.forEach((date) => {
      result[date] = running
      const dayTxns = grouped.find(([d]) => d === date)?.[1] ?? []
      dayTxns.forEach((txn) => {
        // Reverse the effect to get balance before this day
        if (txn.toAccountId === account.id) running -= txn.amount
        else running += txn.amount
      })
    })
    return result
  }, [grouped, account.balance])

  const getAmountForAccount = (
    txn: TransactionWithAccounts
  ): { value: number; isCredit: boolean } => {
    if (txn.toAccountId === account.id)
      return { value: txn.amount, isCredit: true }
    return { value: txn.amount, isCredit: false }
  }

  const today = formatDate(new Date())

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', pb: 4 }}>
      {/* ── Header with month navigation ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          p: '1rem 1.5rem',
          mb: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'background.paper',
        }}
      >
        <IconButton onClick={onBack} size="small">
          <ChevronLeftIcon />
        </IconButton>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2,
            }}
          >
            {account.name}
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Typography>
        </Box>
        <IconButton onClick={nextMonth} size="small">
          <ChevronRightIcon />
        </IconButton>
      </Paper>

      {/* ── Summary bar ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          p: '0.85rem 1.25rem',
          mb: '1rem',
          backgroundColor: 'background.paper',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox size="small" sx={{ p: 0 }} />
            <Typography
              sx={{
                fontSize: '0.9rem',
                color: 'text.secondary',
                fontWeight: 500,
              }}
            >
              Transactions: {monthTxns.length}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              Balance ({formatShortDate(today)}):&nbsp;
              <Typography
                component="span"
                sx={{
                  fontWeight: 700,
                  color: account.balance >= 0 ? '#16a34a' : '#dc2626',
                  fontSize: '0.82rem',
                }}
              >
                {formatCurrency(account.balance)}
              </Typography>
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              Period:&nbsp;
              <Typography
                component="span"
                sx={{
                  fontWeight: 700,
                  color: periodChange >= 0 ? '#16a34a' : '#dc2626',
                  fontSize: '0.82rem',
                }}
              >
                {periodChange >= 0 ? '+' : ''}
                {formatCurrency(periodChange)}
              </Typography>
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* ── Transaction groups ── */}
      {grouped.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            p: '3rem 2rem',
            textAlign: 'center',
            backgroundColor: 'background.paper',
          }}
        >
          <Typography sx={{ color: 'text.secondary' }}>
            No transactions this month
          </Typography>
        </Paper>
      ) : (
        grouped.map(([date, dayTxns]) => {
          const dayNetChange = dayTxns.reduce((sum, txn) => {
            if (txn.toAccountId === account.id) return sum + txn.amount
            return sum - txn.amount
          }, 0)
          const dayBalance = dateBalances[date] ?? 0

          return (
            <Box key={date} sx={{ mb: '0.5rem' }}>
              {/* Date group header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: '1.25rem',
                  py: '0.5rem',
                  backgroundColor: 'action.hover',
                  borderRadius: '10px 10px 0 0',
                  borderLeft: '1px solid',
                  borderRight: '1px solid',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: 'text.primary',
                  }}
                >
                  {formatDayHeader(date)}
                </Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    sx={{ fontSize: '0.78rem', color: 'text.secondary' }}
                  >
                    Balance: {formatCurrency(dayBalance)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: dayNetChange >= 0 ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {dayNetChange >= 0 ? '+' : ''}
                    {formatCurrency(dayNetChange)}
                  </Typography>
                </Box>
              </Box>

              {/* Transaction rows */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: '0 0 10px 10px',
                  border: '1px solid',
                  borderTop: 'none',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  overflow: 'hidden',
                }}
              >
                {dayTxns.map((txn, idx) => {
                  const category = txn.category
                    ? getCategoryById(txn.category)
                    : null
                  const { value, isCredit } = getAmountForAccount(txn)
                  const accentColor = isCredit ? '#16a34a' : '#dc2626'
                  const isTransfer =
                    (txn.fromAccount.type === 'asset' ||
                      txn.fromAccount.type === 'liability') &&
                    (txn.toAccount.type === 'asset' ||
                      txn.toAccount.type === 'liability')
                  const transferAccentColor = '#3b82f6'

                  return (
                    <Box
                      key={txn.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        px: '1rem',
                        py: '0.85rem',
                        borderTop: idx > 0 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        borderRight: `3px solid ${isTransfer ? transferAccentColor : accentColor}`,
                      }}
                    >
                      <Checkbox size="small" sx={{ p: 0, flexShrink: 0 }} />

                      {/* Category icon */}
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          backgroundColor: category?.color
                            ? `${category.color}22`
                            : 'action.selected',
                          border: '1.5px solid',
                          borderColor: category?.color ?? 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.3rem',
                          flexShrink: 0,
                        }}
                      >
                        {category?.icon ??
                          (isTransfer ? '🔄' : isCredit ? '💰' : '💸')}
                      </Box>

                      {/* Description + account */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: 'text.primary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {txn.description}
                        </Typography>
                        <Typography
                          sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                        >
                          {isTransfer
                            ? `${txn.fromAccount.name} → ${txn.toAccount.name}`
                            : isCredit
                              ? txn.fromAccount.name
                              : txn.toAccount.name}
                        </Typography>
                      </Box>

                      {/* Amount + date */}
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography
                          sx={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: isTransfer
                              ? transferAccentColor
                              : accentColor,
                          }}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(value)}
                        </Typography>
                        <Typography
                          sx={{ fontSize: '0.72rem', color: 'text.secondary' }}
                        >
                          {formatShortDate(txn.date)}
                        </Typography>
                      </Box>

                      {/* Three-dot menu */}
                      <TxnRowMenu
                        txn={txn}
                        onEdit={onEditTransaction}
                        onDelete={onDeleteTransaction}
                      />
                    </Box>
                  )
                })}
              </Paper>
            </Box>
          )
        })
      )}

      {/* Category chip legend */}
      {monthTxns.some((t) => t.category) && (
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            flexWrap: 'wrap',
            mt: 1.5,
            px: 0.5,
          }}
        >
          {Array.from(
            new Set(monthTxns.map((t) => t.category).filter(Boolean))
          ).map((catId) => {
            const cat = getCategoryById(catId!)
            if (!cat) return null
            return (
              <Chip
                key={catId}
                label={`${cat.icon ?? ''} ${cat.name}`}
                size="small"
                sx={{
                  fontSize: '0.72rem',
                  backgroundColor: `${cat.color}22`,
                  color: cat.color,
                  fontWeight: 600,
                  height: 22,
                }}
              />
            )
          })}
        </Box>
      )}
    </Box>
  )
}

export default AccountTransactionsView
