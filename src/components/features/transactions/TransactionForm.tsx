'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Input } from '@/components/common'
import { useTransactionForm } from '@/hooks/useTransactionForm'
import { TransactionModeTabs } from './TransactionModeTabs'
import { TransactionAccountFields } from './TransactionAccountFields'
import { CategorySuggestions } from './CategorySuggestions'
import { listAllCategories } from '@/services/categoryService'
import { parseCurrency } from '@/utils/currencyUtils'
import type {
  CreateTransactionDto,
  TransactionCategory,
  UpdateTransactionDto,
  TransactionWithAccounts,
} from '@/types/transaction'
import type { Account } from '@/types/account'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MuiSelect from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

interface TransactionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateTransactionDto) => Promise<void>
  onUpdate?: (id: string, data: UpdateTransactionDto) => Promise<void>
  accounts: Account[]
  defaultFromAccountId?: string
  defaultToAccountId?: string
  editTransaction?: TransactionWithAccounts | null
}

// ── Edit Form ──────────────────────────────────────────────────────────────

const EditTransactionForm: React.FC<{
  txn: TransactionWithAccounts
  accounts: Account[]
  onClose: () => void
  onUpdate: (id: string, data: UpdateTransactionDto) => Promise<void>
}> = ({ txn, accounts, onClose, onUpdate }) => {
  const [amount, setAmount] = useState((txn.amount / 100).toFixed(2))
  const [description, setDescription] = useState(txn.description)
  const [date, setDate] = useState(txn.date)
  const [category, setCategory] = useState(txn.category ?? '')
  const [fromAccountId, setFromAccountId] = useState(txn.fromAccountId)
  const [toAccountId, setToAccountId] = useState(txn.toAccountId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<TransactionCategory[]>([])

  useEffect(() => {
    setAmount((txn.amount / 100).toFixed(2))
    setDescription(txn.description)
    setDate(txn.date)
    setCategory(txn.category ?? '')
    setFromAccountId(txn.fromAccountId)
    setToAccountId(txn.toAccountId)
    setError(null)
  }, [txn])

  useEffect(() => {
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

  const activeAccounts = accounts.filter((a) => a.status === 'active')

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '' || /^[\d,]*\.?\d{0,2}$/.test(e.target.value)) {
      setAmount(e.target.value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountInPaise = parseCurrency(amount)
    if (amountInPaise === null || amountInPaise <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onUpdate(txn.id, {
        amount: amountInPaise,
        description,
        date,
        category: category || undefined,
        fromAccountId,
        toAccountId,
      })
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update transaction'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const groupMeta: Record<TransactionCategory['group'], string> = {
    income: 'Income',
    home: 'Home',
    transportation: 'Transportation',
    food: 'Food & Dining',
    healthcare: 'Healthcare',
    entertainment: 'Entertainment',
    utilities: 'Utilities & Bills',
    personal: 'Personal',
    other: 'Other',
  }
  const groupOrder: TransactionCategory['group'][] = [
    'income',
    'home',
    'transportation',
    'food',
    'healthcare',
    'entertainment',
    'utilities',
    'personal',
    'other',
  ]
  const categoryGroups = groupOrder.map((key) => ({
    key,
    label: groupMeta[key],
    categories: categories.filter((c) => c.group === key),
  }))

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Edit Transaction"
      size="sm"
      contentSx={{ p: 0 }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column' }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            px: '1.5rem',
            py: '1rem',
          }}
        >
          <Box sx={{ display: 'flex', gap: '0.75rem' }}>
            <Box sx={{ flex: 1 }}>
              <Input
                label="Amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                required
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Box>
          </Box>

          <Input
            label="Description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            required
          />

          {/* From Account */}
          <FormControl fullWidth size="small">
            <InputLabel>From Account</InputLabel>
            <MuiSelect
              label="From Account"
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
            >
              {activeAccounts.map((acc) => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.name}
                  <Typography
                    component="span"
                    sx={{
                      ml: 0.75,
                      fontSize: '0.72rem',
                      color: 'text.secondary',
                    }}
                  >
                    ({acc.type})
                  </Typography>
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>

          {/* To Account */}
          <FormControl fullWidth size="small">
            <InputLabel>To Account</InputLabel>
            <MuiSelect
              label="To Account"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
            >
              {activeAccounts.map((acc) => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.name}
                  <Typography
                    component="span"
                    sx={{
                      ml: 0.75,
                      fontSize: '0.72rem',
                      color: 'text.secondary',
                    }}
                  >
                    ({acc.type})
                  </Typography>
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <MuiSelect
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="">No category</MenuItem>
              {categoryGroups.map((group) =>
                group.categories.length > 0
                  ? [
                      <MenuItem
                        key={`group-${group.key}`}
                        disabled
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          opacity: 0.55,
                          py: 0.5,
                        }}
                      >
                        {group.label}
                      </MenuItem>,
                      ...group.categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id} sx={{ pl: 3 }}>
                          {cat.icon || '📌'} {cat.name}
                        </MenuItem>
                      )),
                    ]
                  : []
              )}
            </MuiSelect>
          </FormControl>

          {error && (
            <Box
              sx={{
                p: '0.75rem 1rem',
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'error.main',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: '0.75rem',
            px: '1.5rem',
            pb: '1.5rem',
            pt: '0.5rem',
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={onClose}
            disabled={submitting}
            sx={{
              flex: 1,
              py: '0.75rem',
              px: '1rem',
              backgroundColor: 'transparent !important',
              border: '1.5px solid #d1d5db',
              borderRadius: '0.5rem',
              color: '#374151 !important',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              '&:hover:not(:disabled)': { borderColor: '#9ca3af' },
            }}
          >
            Cancel
          </Box>
          <Box
            component="button"
            type="submit"
            disabled={submitting}
            sx={{
              flex: 2,
              py: '0.75rem',
              px: '1rem',
              border: 'none',
              borderRadius: '0.75rem',
              backgroundColor: submitting ? 'text.disabled' : 'primary.main',
              color: 'primary.contrastText',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              '&:hover:not(:disabled)': { backgroundColor: 'primary.dark' },
            }}
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </Box>
        </Box>
      </Box>
    </Modal>
  )
}

// ── Create Form ────────────────────────────────────────────────────────────

type CreateTransactionFormProps = Omit<
  TransactionFormProps,
  'editTransaction' | 'onUpdate'
>

const CreateTransactionForm: React.FC<CreateTransactionFormProps> = (props) => {
  const {
    entryMode,
    setEntryMode,
    primaryAccountId,
    setPrimaryAccountId,
    secondaryAccountId,
    setSecondaryAccountId,
    amount,
    description,
    setDescription,
    date,
    setDate,
    category,
    setCategory,
    submitting,
    error,
    suggestedCategories,
    config,
    displayAccount,
    handleSubmit,
    handleClose,
    handleAmountChange,
  } = useTransactionForm(props)

  const [categories, setCategories] = useState<TransactionCategory[]>([])

  useEffect(() => {
    if (!props.isOpen) return
    let cancelled = false
    const loadCategories = async () => {
      const all = await listAllCategories()
      if (!cancelled) setCategories(all)
    }
    loadCategories()
    return () => {
      cancelled = true
    }
  }, [props.isOpen])

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleClose}
      title="New Transaction"
      size="sm"
      contentSx={{ p: 0 }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Type Selector ── */}
        <Box sx={{ px: '1.5rem', pt: '1.25rem', pb: '1rem' }}>
          <Typography
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'text.secondary',
              mb: '0.5rem',
            }}
          >
            Type
          </Typography>
          <TransactionModeTabs entryMode={entryMode} onChange={setEntryMode} />
        </Box>

        {/* ── Form Fields ── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            px: '1.5rem',
            py: '1rem',
          }}
        >
          {/* Amount + Date side by side */}
          <Box sx={{ display: 'flex', gap: '0.75rem' }}>
            <Box sx={{ flex: 1 }}>
              <Input
                label="Amount"
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                required
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Box>
          </Box>

          {/* Description full width */}
          <Input
            label="Description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            required
          />

          {/* Account fields */}
          <TransactionAccountFields
            primaryLabel={config.primaryLabel}
            primaryAccounts={config.primaryAccounts}
            primaryAccountId={primaryAccountId}
            onPrimaryChange={(id) => {
              setPrimaryAccountId(id)
              setSecondaryAccountId('')
            }}
            displayAccount={displayAccount}
            secondaryLabel={config.secondaryLabel}
            secondaryAccounts={config.secondaryAccounts}
            secondaryAccountId={secondaryAccountId}
            secondaryPlaceholder={config.secondaryPlaceholder}
            onSecondaryChange={setSecondaryAccountId}
          />

          {/* Category */}
          <CategorySuggestions
            suggestions={suggestedCategories}
            selectedCategory={category}
            categories={categories}
            onSelect={setCategory}
          />

          {/* Error */}
          {error && (
            <Box
              sx={{
                p: '0.75rem 1rem',
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'error.main',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </Box>
          )}
        </Box>

        {/* ── Footer ── */}
        <Box
          sx={{
            display: 'flex',
            gap: '0.75rem',
            px: '1.5rem',
            pb: '1.5rem',
            pt: '0.5rem',
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={handleClose}
            disabled={submitting}
            sx={{
              flex: 1,
              py: '0.75rem',
              px: '1rem',
              backgroundColor: 'transparent !important',
              border: '1.5px solid #d1d5db',
              borderRadius: '0.5rem',
              color: '#374151 !important',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.15s ease',
              '&:hover:not(:disabled)': { borderColor: '#9ca3af' },
            }}
          >
            Cancel
          </Box>

          <Box
            component="button"
            type="submit"
            disabled={submitting}
            sx={{
              flex: 2,
              py: '0.75rem',
              px: '1rem',
              border: 'none',
              borderRadius: '0.75rem',
              backgroundColor: submitting ? 'text.disabled' : 'primary.main',
              color: 'primary.contrastText',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              '&:hover:not(:disabled)': {
                backgroundColor: 'primary.dark',
              },
            }}
          >
            {!submitting && (
              <span
                style={{ fontSize: '1.1rem', lineHeight: 1, color: '#fff' }}
              >
                +
              </span>
            )}
            {submitting ? 'Saving…' : 'Add Transaction'}
          </Box>
        </Box>
      </Box>
    </Modal>
  )
}

/**
 * TransactionForm - unified form for creating or editing a transaction
 */
const TransactionForm: React.FC<TransactionFormProps> = (props) => {
  if (props.editTransaction && props.onUpdate) {
    return (
      <EditTransactionForm
        txn={props.editTransaction}
        accounts={props.accounts}
        onClose={props.onClose}
        onUpdate={props.onUpdate}
      />
    )
  }

  return <CreateTransactionForm {...props} />
}

export default TransactionForm
