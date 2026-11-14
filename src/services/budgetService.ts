import type { Budget, CreateBudgetDto, UpdateBudgetDto } from '@/types/budget'
import * as storageService from './storageService'
import * as transactionService from './transactionService'
import { listAllCategories } from './categoryService'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns'
import { formatDate } from '@/utils/dateUtils'
import type { BudgetPeriod } from '@/types/budget'

function uuid(): string {
  return crypto.randomUUID()
}

/**
 * Budget spending details with calculated metrics
 */
export interface BudgetWithSpending extends Budget {
  spent: number // Total spent in this budget's category
  remaining: number // Budget amount - spent
  percentUsed: number // (spent / amount) * 100
  isOverBudget: boolean // spent > amount
}

/**
 * Current period for a budget as local YYYY-MM-DD strings (weeks start Monday)
 */
export function getBudgetPeriodRange(
  period: BudgetPeriod,
  today: Date = new Date()
): { startDate: string; endDate: string } {
  switch (period) {
    case 'weekly':
      return {
        startDate: formatDate(startOfWeek(today, { weekStartsOn: 1 })),
        endDate: formatDate(endOfWeek(today, { weekStartsOn: 1 })),
      }
    case 'monthly':
      return {
        startDate: formatDate(startOfMonth(today)),
        endDate: formatDate(endOfMonth(today)),
      }
    case 'yearly':
      return {
        startDate: formatDate(startOfYear(today)),
        endDate: formatDate(endOfYear(today)),
      }
  }
}

export async function listBudgets(): Promise<Budget[]> {
  const result = await storageService.getBudgets()
  return result.success ? result.data : []
}

export async function createBudget(dto: CreateBudgetDto): Promise<Budget> {
  const now = new Date().toISOString()
  const budget: Budget = {
    id: uuid(),
    category: dto.category.trim(),
    amount: dto.amount,
    period: dto.period,
    startDate: dto.startDate,
    createdAt: now,
    updatedAt: now,
  }
  const result = await storageService.saveBudget(budget)
  if (!result.success) throw new Error(result.error.message)
  return result.data
}

export async function updateBudget(
  id: string,
  dto: UpdateBudgetDto
): Promise<Budget> {
  const all = await listBudgets()
  const existing = all.find((b) => b.id === id)
  if (!existing) throw new Error('Budget not found')

  const updated: Budget = {
    ...existing,
    ...(dto.category !== undefined && { category: dto.category.trim() }),
    ...(dto.amount !== undefined && { amount: dto.amount }),
    ...(dto.period !== undefined && { period: dto.period }),
    ...(dto.startDate !== undefined && { startDate: dto.startDate }),
    updatedAt: new Date().toISOString(),
  }
  const result = await storageService.saveBudget(updated)
  if (!result.success) throw new Error(result.error.message)
  return result.data
}

export async function deleteBudget(id: string): Promise<void> {
  const result = await storageService.deleteBudget(id)
  if (!result.success) throw new Error(result.error.message)
}

/**
 * Calculate total spent in a category for a given date range
 * @param categoryId - Category ID to sum spending for
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Total amount spent in cents
 */
export async function calculateCategorySpending(
  categoryId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const transactionsResult = await transactionService.listTransactions()
  if (!transactionsResult.success) return 0
  const transactions = transactionsResult.data

  const spent = transactions
    .filter((t) => {
      // Match by category ID
      if (t.category === categoryId) {
        return t.date >= startDate && t.date <= endDate
      }
      return false
    })
    .reduce((sum, t) => sum + t.amount, 0)

  return spent
}

async function resolveBudgetCategoryId(
  category: string
): Promise<string | null> {
  const allCategories = await listAllCategories()

  if (allCategories.some((c) => c.id === category)) {
    return category
  }

  const byName = allCategories.find(
    (c) => c.name.toLowerCase() === category.toLowerCase()
  )
  return byName?.id ?? null
}

/**
 * Get budget with calculated spending and usage percentage
 * @param budget - Budget to calculate
 * @returns Budget with spending metrics
 */
export async function getBudgetWithSpending(
  budget: Budget
): Promise<BudgetWithSpending> {
  const { startDate: startDateStr, endDate: endDateStr } = getBudgetPeriodRange(
    budget.period
  )

  const resolvedCategoryId = await resolveBudgetCategoryId(budget.category)
  const spent = resolvedCategoryId
    ? await calculateCategorySpending(
        resolvedCategoryId,
        startDateStr,
        endDateStr
      )
    : 0

  const remaining = budget.amount - spent
  const percentUsed = (spent / budget.amount) * 100

  return {
    ...budget,
    spent,
    remaining,
    percentUsed: Math.min(percentUsed, 100), // Cap at 100%
    isOverBudget: spent > budget.amount,
  }
}

/**
 * Get all budgets with calculated spending
 * @returns List of budgets with spending metrics
 */
export async function listBudgetsWithSpending(): Promise<BudgetWithSpending[]> {
  const budgets = await listBudgets()
  return Promise.all(budgets.map((b) => getBudgetWithSpending(b)))
}

/**
 * Get budget status summary across all budgets
 */
export async function getBudgetStatus(): Promise<{
  totalBudget: number
  totalSpent: number
  remaining: number
  overBudgetCount: number
  budgets: BudgetWithSpending[]
}> {
  const budgetsWithSpending = await listBudgetsWithSpending()

  const totalBudget = budgetsWithSpending.reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = budgetsWithSpending.reduce((sum, b) => sum + b.spent, 0)
  const overBudgetCount = budgetsWithSpending.filter(
    (b) => b.isOverBudget
  ).length

  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    overBudgetCount,
    budgets: budgetsWithSpending,
  }
}
