'use client'

import React, { useMemo } from 'react'
import type { TransactionWithAccounts } from '@/types/transaction'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { formatCurrency } from '@/utils/currencyUtils'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip as RechartsTooltip,
  ReferenceDot,
} from 'recharts'

interface TransactionMetricsProps {
  transactions: TransactionWithAccounts[]
}

function buildDailySparkline(
  txns: TransactionWithAccounts[],
  type: 'income' | 'expense'
): { day: number; value: number }[] {
  const now = new Date()
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate()
  const buckets: Record<number, number> = {}
  for (let d = 1; d <= daysInMonth; d++) buckets[d] = 0

  txns.forEach((txn) => {
    const d = new Date(txn.date)
    if (
      d.getMonth() !== now.getMonth() ||
      d.getFullYear() !== now.getFullYear()
    )
      return
    const isIncome =
      txn.fromAccount.type === 'income' &&
      (txn.toAccount.type === 'asset' || txn.toAccount.type === 'liability')
    const isExpense =
      (txn.fromAccount.type === 'asset' ||
        txn.fromAccount.type === 'liability') &&
      txn.toAccount.type === 'expense'
    if (type === 'income' && isIncome) buckets[d.getDate()] += txn.amount
    if (type === 'expense' && isExpense) buckets[d.getDate()] += txn.amount
  })

  return Object.entries(buckets).map(([day, value]) => ({
    day: Number(day),
    value,
  }))
}

const TransactionMetrics: React.FC<TransactionMetricsProps> = ({
  transactions,
}) => {
  const metrics = useMemo(() => {
    let totalIncome = 0
    let totalExpenses = 0
    let previousMonthIncome = 0
    let previousMonthExpenses = 0
    let incomeCount = 0
    let expenseCount = 0
    const incomeSources: Record<string, number> = {}
    const expenseCategories: Record<string, number> = {}

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    transactions.forEach((txn) => {
      const txnDate = new Date(txn.date)
      const txnMonth = txnDate.getMonth()
      const txnYear = txnDate.getFullYear()
      const isCurrentMonth =
        txnMonth === currentMonth && txnYear === currentYear
      const isPreviousMonth =
        (txnMonth === currentMonth - 1 && txnYear === currentYear) ||
        (currentMonth === 0 && txnMonth === 11 && txnYear === currentYear - 1)

      const isIncome =
        txn.fromAccount.type === 'income' &&
        (txn.toAccount.type === 'asset' || txn.toAccount.type === 'liability')
      const isExpense =
        (txn.fromAccount.type === 'asset' ||
          txn.fromAccount.type === 'liability') &&
        txn.toAccount.type === 'expense'

      if (isIncome) {
        if (isCurrentMonth) {
          totalIncome += txn.amount
          incomeCount++
        }
        if (isPreviousMonth) previousMonthIncome += txn.amount
        if (isCurrentMonth)
          incomeSources[txn.fromAccount.name] =
            (incomeSources[txn.fromAccount.name] ?? 0) + txn.amount
      }
      if (isExpense) {
        if (isCurrentMonth) {
          totalExpenses += txn.amount
          expenseCount++
        }
        if (isPreviousMonth) previousMonthExpenses += txn.amount
        if (isCurrentMonth && txn.category)
          expenseCategories[txn.category] =
            (expenseCategories[txn.category] ?? 0) + txn.amount
      }
    })

    const incomeChange =
      previousMonthIncome > 0
        ? ((totalIncome - previousMonthIncome) / previousMonthIncome) * 100
        : 0
    const expenseChange =
      previousMonthExpenses > 0
        ? ((totalExpenses - previousMonthExpenses) / previousMonthExpenses) *
          100
        : 0

    const topSource =
      Object.entries(incomeSources).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const topCategory =
      Object.entries(expenseCategories).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      null

    return {
      totalIncome,
      totalExpenses,
      incomeChange,
      expenseChange,
      incomeCount,
      expenseCount,
      topSource,
      topCategory,
    }
  }, [transactions])

  const incomeData = useMemo(
    () => buildDailySparkline(transactions, 'income'),
    [transactions]
  )
  const expenseData = useMemo(
    () => buildDailySparkline(transactions, 'expense'),
    [transactions]
  )

  const monthLabel = new Date()
    .toLocaleDateString('en-US', { month: 'long' })
    .toUpperCase()

  // Last non-zero point for the endpoint dot
  const lastIncomePoint = [...incomeData].reverse().find((d) => d.value > 0)
  const lastExpensePoint = [...expenseData].reverse().find((d) => d.value > 0)

  const renderChange = (change: number, invertColor: boolean) => {
    if (Math.abs(change) < 0.1) return null
    const positive = change > 0
    const color = invertColor
      ? positive
        ? '#ef4444'
        : '#10b981'
      : positive
        ? '#10b981'
        : '#ef4444'
    return (
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color }}>
        {positive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs last month
      </Typography>
    )
  }

  interface CardProps {
    label: string
    amount: string
    amountColor: string
    accentColor: string
    iconBg: string
    iconColor: string
    iconArrow: string
    change: number
    invertColor: boolean
    count: number
    chipLabel: string | null
    chipBg: string
    chipColor: string
    sparkData: { day: number; value: number }[]
    lastPoint: { day: number; value: number } | undefined
    strokeColor: string
    tooltipLabel: string
  }

  const MetricCard = ({
    label,
    amount,
    amountColor,
    accentColor,
    iconBg,
    iconColor,
    iconArrow,
    change,
    invertColor,
    count,
    chipLabel,
    chipBg,
    chipColor,
    sparkData,
    lastPoint,
    strokeColor,
    tooltipLabel,
  }: CardProps) => (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '14px',
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: `4px solid ${accentColor}`,
        backgroundColor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        p: '1.25rem 1.25rem 1.25rem 1rem',
        overflow: 'hidden',
      }}
    >
      {/* Icon circle */}
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '1.5rem',
          color: iconColor,
          fontWeight: 700,
        }}
      >
        {iconArrow}
      </Box>

      {/* Text block */}
      <Box sx={{ flex: '0 0 auto', minWidth: 155 }}>
        <Typography
          sx={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'text.secondary',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            mb: 0.25,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: amountColor,
            lineHeight: 1.1,
            mb: 0.5,
          }}
        >
          {amount}
        </Typography>
        {renderChange(change, invertColor)}
        <Typography
          sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.5 }}
        >
          {count} transactions
        </Typography>
      </Box>

      {/* Chart + chip */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Box sx={{ width: '100%', height: 90 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sparkData}
              margin={{ top: 10, right: 14, left: 0, bottom: 10 }}
            >
              <RechartsTooltip
                formatter={(v: number | undefined) => [
                  formatCurrency(v ?? 0),
                  tooltipLabel,
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: strokeColor }}
              />
              {lastPoint && (
                <ReferenceDot
                  x={lastPoint.day}
                  y={lastPoint.value}
                  r={5}
                  fill={strokeColor}
                  stroke="white"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </Box>
        {chipLabel && (
          <Chip
            label={chipLabel}
            size="small"
            sx={{
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: chipBg,
              color: chipColor,
              height: 22,
              borderRadius: '6px',
            }}
          />
        )}
      </Box>
    </Paper>
  )

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        mb: '1.5rem',
      }}
    >
      <MetricCard
        label={`Total Income (${monthLabel})`}
        amount={formatCurrency(metrics.totalIncome)}
        amountColor="#10b981"
        accentColor="#10b981"
        iconBg="#d1fae5"
        iconColor="#10b981"
        iconArrow="↗"
        change={metrics.incomeChange}
        invertColor={false}
        count={metrics.incomeCount}
        chipLabel={
          metrics.topSource ? `Top source: ${metrics.topSource}` : null
        }
        chipBg="#d1fae5"
        chipColor="#065f46"
        sparkData={incomeData}
        lastPoint={lastIncomePoint}
        strokeColor="#10b981"
        tooltipLabel="Income"
      />
      <MetricCard
        label={`Total Expenses (${monthLabel})`}
        amount={`-${formatCurrency(metrics.totalExpenses)}`}
        amountColor="#ef4444"
        accentColor="#ef4444"
        iconBg="#fee2e2"
        iconColor="#ef4444"
        iconArrow="↙"
        change={metrics.expenseChange}
        invertColor={true}
        count={metrics.expenseCount}
        chipLabel={
          metrics.topCategory ? `Top category: ${metrics.topCategory}` : null
        }
        chipBg="#fee2e2"
        chipColor="#991b1b"
        sparkData={expenseData}
        lastPoint={lastExpensePoint}
        strokeColor="#ef4444"
        tooltipLabel="Expenses"
      />
    </Box>
  )
}

export default TransactionMetrics
