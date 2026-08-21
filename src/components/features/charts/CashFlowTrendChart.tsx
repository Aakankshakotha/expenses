'use client'

import React, { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import { Card } from '@/components/common'
import { formatCurrency } from '@/utils/currencyUtils'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { useTheme, alpha } from '@mui/material/styles'

const PERIOD_OPTIONS = [
  { label: '1 month', value: 1 },
  { label: '3 months', value: 3 },
  { label: '6 months', value: 6 },
  { label: '1 year', value: 12 },
]

interface CashFlowTrendChartProps {
  transactions: Transaction[]
  accounts: Account[]
  periodMonths?: number
}

const CashFlowTrendChart: React.FC<CashFlowTrendChartProps> = ({
  transactions,
  accounts,
  periodMonths: periodMonthsProp,
}) => {
  const [internalPeriod, setInternalPeriod] = useState(periodMonthsProp ?? 6)
  const periodMonths = periodMonthsProp ?? internalPeriod
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<
    'expense' | 'income'
  >('expense')

  const categoryMemoData = useMemo(() => {
    const accountMap = new Map(accounts.map((a) => [a.id, a]))
    const today = new Date()

    const monthKeys: string[] = []
    const monthLabels: string[] = []
    for (let i = periodMonths - 1; i >= 0; i -= 1) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      monthKeys.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      )
      monthLabels.push(d.toLocaleDateString('en-US', { month: 'short' }))
    }

    const expenseAmounts = new Map<string, Map<string, number>>()
    const incomeAmounts = new Map<string, Map<string, number>>()
    const expenseCatNames = new Map<string, string>()
    const incomeCatNames = new Map<string, string>()

    transactions.forEach((txn) => {
      const fromAccount = accountMap.get(txn.fromAccountId)
      const toAccount = accountMap.get(txn.toAccountId)
      if (!fromAccount || !toAccount) return

      const txnDate = new Date(txn.date)
      const key = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`
      if (!monthKeys.includes(key)) return

      const isExpense =
        (fromAccount.type === 'asset' || fromAccount.type === 'liability') &&
        toAccount.type === 'expense'
      if (isExpense) {
        // Always key by account so transactions with/without a category tag
        // don't create duplicate entries for the same expense account.
        const catKey = `acct-${toAccount.id}`
        const catName = toAccount.name
        expenseCatNames.set(catKey, catName)
        if (!expenseAmounts.has(catKey)) expenseAmounts.set(catKey, new Map())
        const m = expenseAmounts.get(catKey)!
        m.set(key, (m.get(key) || 0) + txn.amount)
      }

      if (fromAccount.type === 'income' && toAccount.type === 'asset') {
        // Always key by account so transactions with/without a category tag
        // don't create duplicate entries for the same income source.
        const catKey = `acct-${fromAccount.id}`
        const catName = fromAccount.name
        incomeCatNames.set(catKey, catName)
        if (!incomeAmounts.has(catKey)) incomeAmounts.set(catKey, new Map())
        const m = incomeAmounts.get(catKey)!
        m.set(key, (m.get(key) || 0) + txn.amount)
      }
    })

    const buildTrend = (
      amountMap: Map<string, Map<string, number>>
    ): Record<string, number | string>[] =>
      monthKeys.map((mk, i) => {
        const row: Record<string, number | string> = {
          month: monthLabels[i],
          monthKey: mk,
        }
        amountMap.forEach((monthAmounts, catKey) => {
          row[catKey] = monthAmounts.get(mk) || 0
        })
        return row
      })

    return {
      expenseCategories: Array.from(expenseCatNames.entries()).map(
        ([key, name]) => ({ key, name })
      ),
      incomeCategories: Array.from(incomeCatNames.entries()).map(
        ([key, name]) => ({ key, name })
      ),
      expenseTrendData: buildTrend(expenseAmounts),
      incomeTrendData: buildTrend(incomeAmounts),
    }
  }, [transactions, accounts, periodMonths])

  const hasData =
    categoryMemoData.expenseTrendData.some((row) =>
      categoryMemoData.expenseCategories.some((c) => (row[c.key] as number) > 0)
    ) ||
    categoryMemoData.incomeTrendData.some((row) =>
      categoryMemoData.incomeCategories.some((c) => (row[c.key] as number) > 0)
    )

  const muiTheme = useTheme()

  const chartAxis = muiTheme.palette.text.secondary
  const chartGrid = muiTheme.palette.divider
  const tooltipBg = muiTheme.palette.background.paper
  const tooltipBorder = muiTheme.palette.divider
  const tooltipText = muiTheme.palette.text.primary

  const visibleCategories =
    categoryTypeFilter === 'expense'
      ? categoryMemoData.expenseCategories
      : categoryMemoData.incomeCategories

  const activeCategoryTrendData =
    categoryTypeFilter === 'expense'
      ? categoryMemoData.expenseTrendData
      : categoryMemoData.incomeTrendData

  const activeLineCategories =
    selectedCategory === ''
      ? visibleCategories
      : visibleCategories.filter((c) => c.key === selectedCategory)

  if (!hasData) {
    return (
      <Card sx={{ p: '1.5rem' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: '0.75rem',
          }}
        >
          <Box>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                m: 0,
                color: 'text.primary',
              }}
            >
              Income vs Expenses Trend
            </Typography>
            <Typography
              sx={{ m: 0, fontSize: '0.8125rem', color: 'text.secondary' }}
            >
              Monthly spend by category — last{' '}
              {periodMonths <= 1
                ? '1 month'
                : periodMonths >= 12
                  ? '1 year'
                  : `${periodMonths} months`}
            </Typography>
          </Box>
          {!periodMonthsProp && (
            <Select
              size="small"
              value={internalPeriod}
              onChange={(e) => setInternalPeriod(Number(e.target.value))}
              sx={{ fontSize: '0.8rem', height: 32, minWidth: 100 }}
            >
              {PERIOD_OPTIONS.map((o) => (
                <MenuItem
                  key={o.value}
                  value={o.value}
                  sx={{ fontSize: '0.8rem' }}
                >
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          )}
        </Box>
        <Box
          sx={{
            minHeight: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
            fontSize: '0.95rem',
          }}
        >
          No income/expense transactions yet
        </Box>
      </Card>
    )
  }

  return (
    <Card sx={{ p: '1.5rem' }}>
      {/* ── Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.75rem',
          mb: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              m: 0,
              color: 'text.primary',
            }}
          >
            Income vs Expenses Trend
          </Typography>
          <Typography
            sx={{ m: 0, fontSize: '0.8125rem', color: 'text.secondary' }}
          >
            Monthly spend by category — last{' '}
            {periodMonths <= 1
              ? '1 month'
              : periodMonths >= 12
                ? '1 year'
                : `${periodMonths} months`}
          </Typography>
        </Box>

        {/* Period selector dropdown */}
        {!periodMonthsProp && (
          <Select
            size="small"
            value={internalPeriod}
            onChange={(e) => setInternalPeriod(Number(e.target.value))}
            sx={{
              fontSize: '0.8rem',
              height: 32,
              minWidth: 100,
              '& .MuiSelect-select': { py: '4px' },
            }}
          >
            {PERIOD_OPTIONS.map((o) => (
              <MenuItem
                key={o.value}
                value={o.value}
                sx={{ fontSize: '0.8rem' }}
              >
                {o.label}
              </MenuItem>
            ))}
          </Select>
        )}
      </Box>

      {/* Type toggle + category pills */}
      <Box sx={{ mb: '1.25rem' }}>
        <Box
          sx={{
            display: 'inline-flex',
            backgroundColor: alpha(muiTheme.palette.text.primary, 0.06),
            borderRadius: '10px',
            p: '3px',
            gap: '2px',
            mb: '0.75rem',
          }}
        >
          {(['expense', 'income'] as const).map((type) => (
            <Box
              key={type}
              component="button"
              onClick={() => {
                setCategoryTypeFilter(type)
                setSelectedCategory('')
              }}
              sx={{
                border: 'none',
                cursor: 'pointer',
                px: 2,
                py: 0.75,
                borderRadius: '7px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                transition: 'all 0.18s ease',
                backgroundColor:
                  categoryTypeFilter === type
                    ? type === 'expense'
                      ? alpha(muiTheme.palette.error.main, 0.15)
                      : alpha(muiTheme.palette.success.main, 0.15)
                    : 'transparent',
                color:
                  categoryTypeFilter === type
                    ? type === 'expense'
                      ? muiTheme.palette.error.main
                      : muiTheme.palette.success.main
                    : 'text.secondary',
                boxShadow:
                  categoryTypeFilter === type
                    ? '0 1px 4px rgba(0,0,0,0.10)'
                    : 'none',
              }}
            >
              {type === 'expense' ? 'Expenses' : 'Income'}
            </Box>
          ))}
        </Box>

        {visibleCategories.length > 0 ? (
          <Box
            sx={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              pb: '4px',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {[{ key: '', name: 'All' }, ...visibleCategories].map((cat) => {
              const isActive = selectedCategory === cat.key
              const activeColor =
                categoryTypeFilter === 'expense'
                  ? muiTheme.palette.error.main
                  : muiTheme.palette.success.main
              return (
                <Box
                  key={cat.key || 'all'}
                  component="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  sx={{
                    border: '1.5px solid',
                    borderColor: isActive ? activeColor : 'divider',
                    cursor: 'pointer',
                    px: 1.75,
                    py: 0.625,
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                    backgroundColor: isActive
                      ? alpha(activeColor, 0.1)
                      : 'background.paper',
                    color: isActive ? activeColor : 'text.secondary',
                  }}
                >
                  {cat.name}
                </Box>
              )
            })}
          </Box>
        ) : (
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            No {categoryTypeFilter} categories yet
          </Typography>
        )}
      </Box>

      <Box sx={{ '& *:focus': { outline: 'none' } }}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={activeCategoryTrendData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartGrid}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: chartAxis }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: chartAxis }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) =>
                `$${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`
              }
              width={52}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              }}
              labelStyle={{ color: tooltipText, fontWeight: 600 }}
              itemStyle={{ color: tooltipText }}
              formatter={(value: number | undefined) =>
                value !== undefined ? formatCurrency(value) : ''
              }
            />
            <Legend
              wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }}
              formatter={(value) => (
                <span style={{ color: tooltipText }}>{value}</span>
              )}
            />
            {activeLineCategories.map((cat, i) => {
              const color =
                muiTheme.palette.charts.categorical[
                  i % muiTheme.palette.charts.categorical.length
                ]
              return (
                <Line
                  key={cat.key}
                  type="monotone"
                  dataKey={cat.key}
                  name={cat.name}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ fill: color, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  )
}

export default CashFlowTrendChart
