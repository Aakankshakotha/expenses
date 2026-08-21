'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import type { BudgetWithSpending } from '@/services/budgetService'
import * as budgetService from '@/services/budgetService'
import { listAllCategories } from '@/services/categoryService'
import { formatCurrency } from '@/utils/currencyUtils'

const BudgetProgress: React.FC = () => {
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryNames, setCategoryNames] = useState<Map<string, string>>(
    new Map()
  )

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [budgetData, categories] = await Promise.all([
          budgetService.listBudgetsWithSpending(),
          listAllCategories(),
        ])

        if (!cancelled) {
          setBudgets(budgetData)
          setCategoryNames(new Map(categories.map((c) => [c.id, c.name])))
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load budgets')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const spending = useMemo(
    () =>
      budgets.map((b) => ({
        label: categoryNames.get(b.category) ?? b.category,
        spent: b.spent,
        budget: b.amount,
      })),
    [budgets, categoryNames]
  )

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
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: '1rem',
          color: 'text.primary',
          mb: '1.25rem',
        }}
      >
        Budget Progress
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : spending.length === 0 ? (
        <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
          No budgets yet. Add budgets to see progress.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {spending.map(({ label, spent, budget }) => {
            const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
            const overBudget = spent > budget
            return (
              <Box key={label}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: '6px',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'text.primary',
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
                  >
                    {formatCurrency(spent)} / {formatCurrency(budget)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      backgroundColor: overBudget
                        ? 'error.main'
                        : 'primary.main',
                    },
                  }}
                />
              </Box>
            )
          })}
        </Box>
      )}
    </Paper>
  )
}

export default BudgetProgress
