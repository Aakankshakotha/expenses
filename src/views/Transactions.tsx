'use client'

import React, { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import MuiButton from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import AddIcon from '@mui/icons-material/Add'
import {
  TransactionForm,
  TransactionTable,
  TransactionMetrics,
} from '@/components/features'
import { TransactionFilters } from '@/components/features'
import { useTransactions } from '@/hooks/useTransactions'
import { useTransactionFilters } from '@/hooks/useTransactionFilters'
import type { TransactionCategory } from '@/types/transaction'
import { listAllCategories } from '@/services/categoryService'

const PAGE_SIZE = 10

const TransactionsPage: React.FC = () => {
  const {
    transactions,
    accounts,
    loading,
    error,
    isFormOpen,
    openForm,
    closeForm,
    editingTransaction,
    openEditForm,
    closeEditForm,
    handleCreateTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
  } = useTransactions()

  const {
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    filteredTransactions,
  } = useTransactionFilters(transactions)

  const [page, setPage] = useState(1)
  const [categories, setCategories] = React.useState<TransactionCategory[]>([])

  React.useEffect(() => {
    let cancelled = false
    const loadCategories = async () => {
      const all = await listAllCategories()
      if (!cancelled) setCategories(all)
    }
    loadCategories()
    return () => {
      cancelled = true
    }
  }, [])

  // Reset to page 1 whenever filters change
  React.useEffect(() => {
    setPage(1)
  }, [filteredTransactions.length])

  // Insights
  const insights = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

    const catTotals: Record<string, number> = {}
    const prevCatTotals: Record<string, number> = {}

    transactions.forEach((txn) => {
      const d = new Date(txn.date)
      const isExpense =
        (txn.fromAccount.type === 'asset' ||
          txn.fromAccount.type === 'liability') &&
        txn.toAccount.type === 'expense'
      if (!isExpense || !txn.category) return
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        catTotals[txn.category] = (catTotals[txn.category] ?? 0) + txn.amount
      }
      if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
        prevCatTotals[txn.category] =
          (prevCatTotals[txn.category] ?? 0) + txn.amount
      }
    })

    const topCatEntry = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]
    const topCatId = topCatEntry?.[0]
    const topCatName = topCatId
      ? (categories.find((c) => c.id === topCatId)?.name ?? topCatId)
      : null
    const topCatPct =
      topCatId && Object.values(catTotals).reduce((s, v) => s + v, 0) > 0
        ? Math.round(
            (catTotals[topCatId] /
              Object.values(catTotals).reduce((s, v) => s + v, 0)) *
              100
          )
        : null

    return { topCatName, topCatPct }
  }, [transactions, categories])

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE)
  )
  const pagedTransactions = filteredTransactions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Loading transactions...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: '2rem' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Transactions
        </Typography>
        <Box sx={{ color: 'error.main', mt: '1rem' }}>{error}</Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* ── Header ── */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: '1.75rem',
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontSize: '1.8rem',
              color: 'text.primary',
              mb: 0.25,
            }}
          >
            Transactions
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            Track and manage all your income and expenses
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Filter icon drawer */}
          <TransactionFilters
            categories={categories}
            customStartDate={customStartDate}
            onCustomStartChange={setCustomStartDate}
            customEndDate={customEndDate}
            onCustomEndChange={setCustomEndDate}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
          />
          <MuiButton
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            Export CSV
          </MuiButton>
          <MuiButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openForm}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            Add Transaction
          </MuiButton>
        </Box>
      </Box>

      {/* ── Metric Cards ── */}
      <TransactionMetrics transactions={transactions} />

      {/* ── Insights Strip ── */}
      {insights.topCatName && (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            p: '1rem 1.5rem',
            mb: '1.5rem',
            backgroundColor: 'background.paper',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              mb: 1,
            }}
          >
            This Month's Insights
          </Typography>
          <Box sx={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: 'warning.main',
                  opacity: 0.9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                }}
              >
                🛒
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.82rem', color: 'text.primary' }}>
                  <strong>{insights.topCatName}</strong> is your highest
                </Typography>
                <Typography
                  sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                >
                  expense category
                  {insights.topCatPct != null
                    ? ` (${insights.topCatPct}%)`
                    : ''}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* ── Table ── */}
      <TransactionTable
        transactions={pagedTransactions}
        categories={categories}
        onDelete={handleDeleteTransaction}
        onEdit={openEditForm}
      />

      {/* ── Footer: count + pagination ── */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: '1rem',
          px: '0.25rem',
        }}
      >
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
          Showing{' '}
          {pagedTransactions.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
          {Math.min(page * PAGE_SIZE, filteredTransactions.length)} of{' '}
          {filteredTransactions.length} transactions
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '6px',
            }}
          >
            <NavigateBeforeIcon fontSize="small" />
          </IconButton>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
            )
            .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                acc.push('ellipsis')
              acc.push(p)
              return acc
            }, [])
            .map((p, idx) =>
              p === 'ellipsis' ? (
                <Typography
                  key={`e${idx}`}
                  sx={{ px: 0.5, color: 'text.secondary', fontSize: '0.85rem' }}
                >
                  …
                </Typography>
              ) : (
                <IconButton
                  key={p}
                  size="small"
                  onClick={() => setPage(p as number)}
                  sx={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: page === p ? 'primary.main' : 'divider',
                    backgroundColor:
                      page === p ? 'primary.main' : 'transparent',
                    color: page === p ? 'primary.contrastText' : 'text.primary',
                    fontWeight: page === p ? 700 : 400,
                    fontSize: '0.82rem',
                  }}
                >
                  {p}
                </IconButton>
              )
            )}
          <IconButton
            size="small"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '6px',
            }}
          >
            <NavigateNextIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <TransactionForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={handleCreateTransaction}
        accounts={accounts}
      />
      <TransactionForm
        isOpen={!!editingTransaction}
        onClose={closeEditForm}
        onSubmit={handleCreateTransaction}
        onUpdate={handleUpdateTransaction}
        accounts={accounts}
        editTransaction={editingTransaction}
      />
    </Box>
  )
}

export default TransactionsPage
