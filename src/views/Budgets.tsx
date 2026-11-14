'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import { useTheme } from '@mui/material/styles'
import type { Budget, CreateBudgetDto, BudgetPeriod } from '@/types/budget'
import type { Transaction, TransactionCategory } from '@/types/transaction'
import type { Account } from '@/types/account'
import * as budgetService from '@/services/budgetService'
import * as transactionService from '@/services/transactionService'
import * as accountService from '@/services/accountService'
import { listAllCategories } from '@/services/categoryService'
import { centsToDollars, dollarsToCents } from '@/utils/currencyUtils'
import { formatCurrency } from '@/utils/currencyUtils'
import { formatDate } from '@/utils/dateUtils'

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  monthly: 'Monthly',
  weekly: 'Weekly',
  yearly: 'Yearly',
}

// ── Budget Form Modal ─────────────────────────────────────────────────────────
interface BudgetFormProps {
  open: boolean
  editing: Budget | null
  categories: TransactionCategory[]
  onClose: () => void
  onSave: (dto: CreateBudgetDto) => Promise<void>
}

const BudgetForm: React.FC<BudgetFormProps> = ({
  open,
  editing,
  categories,
  onClose,
  onSave,
}) => {
  const today = formatDate(new Date())

  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState<BudgetPeriod>('monthly')
  const [startDate, setStartDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCategory(editing?.category ?? '')
      setAmount(editing ? String(centsToDollars(editing.amount)) : '')
      setPeriod(editing?.period ?? 'monthly')
      setStartDate(editing?.startDate ?? today)
      setError(null)
    }
  }, [open, editing, today])

  const handleSubmit = async () => {
    if (!category) {
      setError('Please select a category')
      return
    }
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid budget amount')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        category,
        amount: dollarsToCents(parsed),
        period,
        startDate,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save budget')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px', p: '0.5rem' },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', pb: 0 }}>
        {editing ? 'Edit Budget' : 'New Budget'}
      </DialogTitle>

      <DialogContent
        sx={{
          pt: '1.25rem !important',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {error && (
          <Alert severity="error" sx={{ borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        {/* Category */}
        <FormControl fullWidth>
          <InputLabel id="budget-cat-label">Category</InputLabel>
          <Select
            labelId="budget-cat-label"
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            sx={{ borderRadius: '10px' }}
          >
            <MenuItem value="" disabled>
              Select category...
            </MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.icon || '📌'} {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Amount */}
        <TextField
          label="Budget Amount"
          type="number"
          inputProps={{ min: 0, step: 0.01 }}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        />

        {/* Period */}
        <FormControl fullWidth>
          <InputLabel id="budget-period-label">Period</InputLabel>
          <Select
            labelId="budget-period-label"
            label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
            sx={{ borderRadius: '10px' }}
          >
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>

        {/* Start Date */}
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        />
      </DialogContent>

      <DialogActions sx={{ px: '1.5rem', pb: '1.25rem', gap: '0.75rem' }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={saving}
          sx={{
            flex: 1,
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.25,
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          sx={{
            flex: 1,
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.25,
            backgroundColor: '#1e2d4a',
            '&:hover': { backgroundColor: '#162238' },
          }}
        >
          {saving ? (
            <CircularProgress size={18} color="inherit" />
          ) : editing ? (
            'Update Budget'
          ) : (
            'Create Budget'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Budget Card ───────────────────────────────────────────────────────────────
interface BudgetCardProps {
  budget: Budget
  categoryName?: string
  spent: number
  onEdit: () => void
  onDelete: () => void
}

const BudgetCard: React.FC<BudgetCardProps> = ({
  budget,
  categoryName,
  spent,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme()
  const remaining = budget.amount - spent
  const pct =
    budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0
  const overBudget = spent > budget.amount

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        p: '1.25rem 1.5rem',
        backgroundColor: 'background.paper',
      }}
    >
      {/* Header: name + icons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: '0.25rem',
        }}
      >
        <Box>
          <Typography
            sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}
          >
            {categoryName ?? budget.category}
          </Typography>
          <Typography
            sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: '2px' }}
          >
            {PERIOD_LABELS[budget.period]}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: '4px' }}>
          <IconButton
            size="small"
            onClick={onEdit}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onDelete}
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
          >
            <DeleteOutlineIcon
              fontSize="small"
              sx={{ color: theme.palette.error.main }}
            />
          </IconButton>
        </Box>
      </Box>

      {/* Spent / Budget line */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: '0.625rem',
          mt: '1rem',
        }}
      >
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
          Spent:{' '}
          <strong style={{ color: theme.palette.text.primary }}>
            {formatCurrency(spent)}
          </strong>
        </Typography>
        <Typography
          sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'text.primary' }}
        >
          Budget: {formatCurrency(budget.amount)}
        </Typography>
      </Box>

      {/* Progress bar */}
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            backgroundColor: overBudget
              ? theme.palette.error.main
              : theme.palette.primary.main,
          },
        }}
      />

      {/* Remaining / % */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: '0.625rem',
        }}
      >
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          {overBudget ? (
            <span style={{ color: theme.palette.error.main }}>
              {formatCurrency(Math.abs(remaining))} over budget
            </span>
          ) : (
            `${formatCurrency(remaining)} remaining`
          )}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: overBudget
              ? theme.palette.error.main
              : theme.palette.success.main,
          }}
        >
          {Math.round(pct)}%
        </Typography>
      </Box>
    </Paper>
  )
}

// ── Budgets Page ──────────────────────────────────────────────────────────────
const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [b, t, a, c] = await Promise.all([
        budgetService.listBudgets(),
        transactionService
          .listTransactions()
          .then((r) => (r.success ? r.data : [])),
        accountService.listAccounts().then((r) => (r.success ? r.data : [])),
        listAllCategories(),
      ])
      setBudgets(b)
      setTransactions(t)
      setAccounts(a)
      setCategories(c)
    } catch {
      setError('Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const categoryById = new Map(categories.map((c) => [c.id, c]))

  // Calculate how much was spent for a budget this period
  const calcSpent = (budget: Budget): number => {
    const { startDate, endDate } = budgetService.getBudgetPeriodRange(
      budget.period
    )

    const directId = categoryById.has(budget.category) ? budget.category : null
    const legacyMatch = directId
      ? null
      : categories.find(
          (c) => c.name.toLowerCase() === budget.category.toLowerCase()
        )
    const categoryId = directId ?? legacyMatch?.id

    if (!categoryId) return 0

    return transactions
      .filter(
        (txn) =>
          txn.category === categoryId &&
          txn.date >= startDate &&
          txn.date <= endDate
      )
      .reduce((sum, txn) => sum + txn.amount, 0)
  }

  const handleSave = async (dto: CreateBudgetDto) => {
    if (editing) {
      await budgetService.updateBudget(editing.id, dto)
    } else {
      await budgetService.createBudget(dto)
    }
    await load()
  }

  const handleDelete = async (id: string) => {
    await budgetService.deleteBudget(id)
    await load()
  }

  const openEdit = (budget: Budget) => {
    setEditing(budget)
    setFormOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: '2rem',
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: '1.8rem',
              fontWeight: 700,
              color: 'text.primary',
              m: 0,
            }}
          >
            Budgets
          </Typography>
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: 'text.secondary',
              mt: '0.25rem',
            }}
          >
            Track spending against your budget limits
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '10px',
            px: 2.5,
            py: 1,
            backgroundColor: '#1e2d4a',
            '&:hover': { backgroundColor: '#162238' },
          }}
        >
          Add Budget
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {budgets.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            gap: 2,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: '3rem', lineHeight: 1 }}>💰</Typography>
          <Typography
            sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}
          >
            No budgets yet
          </Typography>
          <Typography
            sx={{ fontSize: '0.9rem', color: 'text.secondary', maxWidth: 340 }}
          >
            Create your first budget to start tracking your spending against
            limits.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '10px',
              mt: 1,
              backgroundColor: '#1e2d4a',
              '&:hover': { backgroundColor: '#162238' },
            }}
          >
            Add Budget
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              categoryName={categoryById.get(budget.category)?.name}
              spent={calcSpent(budget)}
              onEdit={() => openEdit(budget)}
              onDelete={() => handleDelete(budget.id)}
            />
          ))}
        </Box>
      )}

      <BudgetForm
        open={formOpen}
        editing={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </Box>
  )
}

export default Budgets
