'use client'

import React, { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import MuiButton from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import {
  AccountListItem,
  AccountTransactionsView,
  AccountForm,
  AccountSummaryCards,
} from '@/components/features'
import { Button } from '@/components/common'
import { useAccounts } from '@/hooks/useAccounts'
import type { Account } from '@/types/account'
import type { TransactionWithAccounts } from '@/types/transaction'

/**
 * Accounts page – list view + per-account transaction detail.
 */
const Accounts: React.FC = () => {
  const {
    accounts,
    transactions,
    loading,
    error,
    isFormOpen,
    editingAccount,
    activeAccounts,
    totalAssets,
    totalLiabilities,
    netWorth,
    loadAccounts,
    handleCreateAccount,
    handleEditAccount,
    handleDeleteAccount,
    handleToggleAccountStatus,
    handleCloseForm,
    openAddForm,
  } = useAccounts()

  const [detailAccount, setDetailAccount] = useState<Account | null>(null)

  // Hydrate plain transactions with populated account objects
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )
  const hydratedTransactions = useMemo((): TransactionWithAccounts[] => {
    return transactions
      .map((txn) => {
        const fromAccount = accountMap.get(txn.fromAccountId)
        const toAccount = accountMap.get(txn.toAccountId)
        if (!fromAccount || !toAccount) return null
        return { ...txn, fromAccount, toAccount }
      })
      .filter((t): t is TransactionWithAccounts => t !== null)
  }, [transactions, accountMap])

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
        <Typography color="text.secondary">Loading accounts...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: '2rem', maxWidth: '640px', margin: '0 auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={loadAccounts}>Retry</Button>
      </Box>
    )
  }

  // ── Detail / transactions view ──
  if (detailAccount) {
    // Keep account in sync with latest data
    const latestAccount =
      accounts.find((a) => a.id === detailAccount.id) ?? detailAccount
    return (
      <Box sx={{ p: '1.5rem', maxWidth: '680px', margin: '0 auto' }}>
        <AccountTransactionsView
          account={latestAccount}
          transactions={hydratedTransactions}
          onBack={() => setDetailAccount(null)}
        />
        <AccountForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleCreateAccount}
          accounts={accounts}
          account={editingAccount ?? undefined}
        />
      </Box>
    )
  }

  // ── List view ──
  const assetAccounts = activeAccounts.filter((a) => a.type === 'asset')
  const liabilityAccounts = activeAccounts.filter((a) => a.type === 'liability')
  const incomeAccounts = activeAccounts.filter((a) => a.type === 'income')
  const expenseAccounts = activeAccounts.filter((a) => a.type === 'expense')

  const sections = [
    { label: 'Assets', items: assetAccounts },
    { label: 'Liabilities', items: liabilityAccounts },
    { label: 'Income', items: incomeAccounts },
    { label: 'Expenses', items: expenseAccounts },
  ].filter((s) => s.items.length > 0)

  return (
    <Box sx={{ p: '1.5rem 2rem', maxWidth: '680px', margin: '0 auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: '1.5rem',
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
            Accounts
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            Manage your financial accounts
          </Typography>
        </Box>
        <MuiButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAddForm}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
        >
          Add Account
        </MuiButton>
      </Box>

      {/* Summary cards */}
      <AccountSummaryCards
        netWorth={netWorth}
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
      />

      {/* Account sections */}
      {sections.map(({ label, items }) => (
        <Box key={label} sx={{ mb: '1.5rem' }}>
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              mb: '0.6rem',
              px: '0.25rem',
            }}
          >
            {label}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {items.map((account) => (
              <AccountListItem
                key={account.id}
                account={account}
                onClick={() => setDetailAccount(account)}
                onEdit={handleEditAccount}
                onToggleStatus={handleToggleAccountStatus}
                onDelete={handleDeleteAccount}
              />
            ))}
          </Box>
        </Box>
      ))}

      {sections.length === 0 && (
        <Box sx={{ textAlign: 'center', py: '4rem', color: 'text.secondary' }}>
          <Typography sx={{ mb: 1 }}>No accounts yet</Typography>
          <Button onClick={openAddForm}>Add your first account</Button>
        </Box>
      )}

      <AccountForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleCreateAccount}
        accounts={accounts}
        account={editingAccount ?? undefined}
      />
    </Box>
  )
}

export default Accounts
