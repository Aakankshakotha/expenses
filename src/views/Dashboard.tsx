'use client'

import React, { useMemo } from 'react'
import {
  CashFlowTrendChart,
  MoneyFlowChart,
  ExpensesChart,
  MonthlyCashflowBarChart,
  BudgetProgress,
  RecentTransactionsList,
} from '@/components/features'
import { MetricCard } from '@/components/common'
import { useDashboardData } from '@/hooks/useDashboardData'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import MuiButton from '@mui/material/Button'
import { useTheme, alpha } from '@mui/material/styles'
import { useRouter } from 'next/navigation'

const Dashboard: React.FC = () => {
  const { accounts, transactions, metrics, loading, error } = useDashboardData()
  const { netWorth, totalAssets, income, expenses, cashFlow } = metrics
  const muiTheme = useTheme()
  const router = useRouter()

  // This month's transactions for charts
  const thisMonthTransactions = useMemo(() => {
    const now = new Date()
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      )
    })
  }, [transactions])

  const thisMonthCount = thisMonthTransactions.length

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
        <Typography color="text.secondary">Loading dashboard...</Typography>
      </Box>
    )
  }

  // ── Onboarding: no accounts set up yet ──────────────────────────────────────
  if (!loading && accounts.length === 0) {
    const steps = [
      {
        icon: '🏦',
        title: 'Add your accounts',
        desc: 'Start by adding your bank, credit card, or investment accounts so we know where your money lives.',
        cta: 'Add Account',
        route: '/accounts',
      },
      {
        icon: '💸',
        title: 'Record a transaction',
        desc: 'Log income, expenses, or transfers between accounts to start building your financial picture.',
        cta: 'Add Transaction',
        route: '/transactions',
      },
      {
        icon: '🔁',
        title: 'Set up recurring payments',
        desc: 'Automate your rent, subscriptions, or salary so nothing gets missed.',
        cta: 'Add Recurring',
        route: '/recurring',
      },
    ]
    return (
      <Box
        sx={{
          padding: '3rem 2rem',
          maxWidth: '860px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 2 }}>
          👋
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'text.primary',
            mb: 1,
          }}
        >
          Welcome to MoneyFlow
        </Typography>
        <Typography
          sx={{
            fontSize: '1rem',
            color: 'text.secondary',
            mb: '3rem',
            maxWidth: '520px',
            mx: 'auto',
          }}
        >
          Your personal finance dashboard is ready. Follow these three steps to
          get started.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            textAlign: 'left',
            mb: '2.5rem',
          }}
        >
          {steps.map((step, i) => (
            <Box
              key={step.route}
              sx={{
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '16px',
                p: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: `"${i + 1}"`,
                  position: 'absolute',
                  top: '1rem',
                  right: '1.25rem',
                  fontSize: '3rem',
                  fontWeight: 900,
                  color: alpha(muiTheme.palette.text.primary, 0.05),
                  lineHeight: 1,
                },
              }}
            >
              <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>
                {step.icon}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'text.primary',
                }}
              >
                {step.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                  lineHeight: 1.6,
                  flex: 1,
                }}
              >
                {step.desc}
              </Typography>
              <MuiButton
                variant="contained"
                size="small"
                onClick={() => router.push(step.route)}
                sx={{
                  alignSelf: 'flex-start',
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
              >
                {step.cta}
              </MuiButton>
            </Box>
          ))}
        </Box>

        <MuiButton
          variant="outlined"
          size="large"
          onClick={() => router.push('/accounts')}
          sx={{
            textTransform: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            px: 4,
          }}
        >
          Get Started →
        </MuiButton>
      </Box>
    )
  }

  return (
    <Box sx={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* ── Page header ── */}
      <Box sx={{ mb: '2rem' }}>
        <Typography
          component="h1"
          sx={{
            fontSize: '1.8rem',
            fontWeight: 700,
            color: 'text.primary',
            m: 0,
          }}
        >
          Dashboard
        </Typography>
        <Typography
          sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: '0.25rem' }}
        >
          Financial overview for this month
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ── Row 1: Metric cards ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          mb: '1.75rem',
        }}
      >
        <MetricCard
          title="Net Worth"
          value={netWorth}
          subtitle={`Assets: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAssets)}`}
        />
        <MetricCard
          title="Monthly Income"
          value={income}
          valueColor={muiTheme.palette.success.main}
        />
        <MetricCard
          title="Monthly Expenses"
          value={expenses}
          valueColor={muiTheme.palette.error.main}
        />
        <MetricCard
          title="Monthly Savings"
          value={cashFlow}
          valueColor={
            cashFlow >= 0
              ? muiTheme.palette.success.main
              : muiTheme.palette.error.main
          }
          subtitle={`${thisMonthCount} transaction${thisMonthCount !== 1 ? 's' : ''}`}
        />
      </Box>

      {/* ── Row 2: Money Flow (full width) ── */}
      <Box sx={{ mb: '1.75rem' }}>
        <MoneyFlowChart
          transactions={thisMonthTransactions}
          accounts={accounts}
        />
      </Box>

      {/* ── Row 3: Monthly Cashflow bar + Spending by Category ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: '1.25rem',
          mb: '1.75rem',
        }}
      >
        <MonthlyCashflowBarChart
          transactions={transactions}
          accounts={accounts}
          periodMonths={6}
        />
        <ExpensesChart
          transactions={thisMonthTransactions}
          accounts={accounts}
        />
      </Box>

      {/* ── Row 4: Income vs Expenses Trend (full width) ── */}
      <Box sx={{ mb: '1.75rem' }}>
        <CashFlowTrendChart transactions={transactions} accounts={accounts} />
      </Box>

      {/* ── Row 5: Budget Progress + Recent Transactions ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)',
          gap: '1.25rem',
          mb: '1.75rem',
          alignItems: 'stretch',
        }}
      >
        <BudgetProgress />
        <RecentTransactionsList transactions={transactions} limit={8} />
      </Box>
    </Box>
  )
}

export default Dashboard
