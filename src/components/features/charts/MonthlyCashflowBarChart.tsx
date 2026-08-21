'use client'

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Transaction } from '@/types/transaction'
import type { Account } from '@/types/account'
import { formatCurrency } from '@/utils/currencyUtils'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import { useTheme } from '@mui/material/styles'

interface MonthlyCashflowBarChartProps {
  transactions: Transaction[]
  accounts: Account[]
  periodMonths?: number
}

const MonthlyCashflowBarChart: React.FC<MonthlyCashflowBarChartProps> = ({
  transactions,
  accounts,
  periodMonths = 6,
}) => {
  const muiTheme = useTheme()

  const chartData = useMemo(() => {
    const accountMap = new Map(accounts.map((a) => [a.id, a]))
    const today = new Date()

    return Array.from({ length: periodMonths }, (_, i) => {
      const d = new Date(
        today.getFullYear(),
        today.getMonth() - (periodMonths - 1 - i),
        1
      )
      const year = d.getFullYear()
      const month = d.getMonth()
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })

      let income = 0
      let expenses = 0

      transactions.forEach((txn) => {
        const txnDate = new Date(txn.date)
        if (txnDate.getFullYear() !== year || txnDate.getMonth() !== month)
          return
        const from = accountMap.get(txn.fromAccountId)
        const to = accountMap.get(txn.toAccountId)
        if (!from || !to) return
        if (from.type === 'income' && to.type === 'asset') income += txn.amount
        if (
          (from.type === 'asset' || from.type === 'liability') &&
          to.type === 'expense'
        )
          expenses += txn.amount
      })

      return { key: monthKey, month: label, income, expenses }
    })
  }, [transactions, accounts, periodMonths])

  const incomeColor = muiTheme.palette.success.main
  const expenseColor = muiTheme.palette.error.main
  const chartAxis = muiTheme.palette.text.secondary
  const chartGrid = muiTheme.palette.divider
  const tooltipBg = muiTheme.palette.background.paper
  const tooltipBorder = muiTheme.palette.divider
  const tooltipText = muiTheme.palette.text.primary

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        p: '1.5rem',
        backgroundColor: 'background.paper',
      }}
    >
      <Box sx={{ mb: '1.25rem' }}>
        <Typography
          sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}
        >
          Monthly Cashflow
        </Typography>
      </Box>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} barCategoryGap="30%">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartGrid}
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: chartAxis }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: chartAxis }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            }}
            labelStyle={{
              color: tooltipText,
              fontWeight: 700,
              marginBottom: 4,
            }}
            itemStyle={{ color: tooltipText }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }} />
          <Bar
            dataKey="income"
            name="Income"
            fill={incomeColor}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill={expenseColor}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}

export default MonthlyCashflowBarChart
