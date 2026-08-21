/**
 * Budget-related types
 */

export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly'

export interface Budget {
  id: string // UUID v4
  category: string // Category label (e.g. "Housing", "Food & Dining")
  amount: number // Budget limit (positive number)
  period: BudgetPeriod
  startDate: string // YYYY-MM-DD
  createdAt: string // ISO 8601 timestamp
  updatedAt: string // ISO 8601 timestamp
}

export interface CreateBudgetDto {
  category: string
  amount: number
  period: BudgetPeriod
  startDate: string
}

export interface UpdateBudgetDto {
  category?: string
  amount?: number
  period?: BudgetPeriod
  startDate?: string
}
