import { useState, useEffect } from 'react'
import type { TransactionWithAccounts } from '@/types/transaction'

export type TransactionType = 'expense' | 'income' | 'transfer'
export const ALL_TYPES: TransactionType[] = ['expense', 'income', 'transfer']

export interface UseTransactionFiltersReturn {
  customStartDate: string
  setCustomStartDate: React.Dispatch<React.SetStateAction<string>>
  customEndDate: string
  setCustomEndDate: React.Dispatch<React.SetStateAction<string>>
  searchTerm: string
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>
  accountFilter: string
  setAccountFilter: React.Dispatch<React.SetStateAction<string>>
  typeFilter: TransactionType[]
  setTypeFilter: React.Dispatch<React.SetStateAction<TransactionType[]>>
  categoryFilter: string
  setCategoryFilter: React.Dispatch<React.SetStateAction<string>>
  filteredTransactions: TransactionWithAccounts[]
}

export const useTransactionFilters = (
  transactions: TransactionWithAccounts[]
): UseTransactionFiltersReturn => {
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [accountFilter, setAccountFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<TransactionType[]>(ALL_TYPES)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [filteredTransactions, setFilteredTransactions] = useState<
    TransactionWithAccounts[]
  >([])

  useEffect(() => {
    let filtered = [...transactions]

    if (customStartDate) {
      const start = new Date(customStartDate)
      filtered = filtered.filter((t) => new Date(t.date) >= start)
    }

    if (customEndDate) {
      const end = new Date(customEndDate)
      end.setHours(23, 59, 59)
      filtered = filtered.filter((t) => new Date(t.date) <= end)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(term) ||
          t.fromAccount.name.toLowerCase().includes(term) ||
          t.toAccount.name.toLowerCase().includes(term) ||
          t.amount.toString().includes(term)
      )
    }

    if (accountFilter !== 'all') {
      filtered = filtered.filter(
        (t) =>
          t.fromAccountId === accountFilter || t.toAccountId === accountFilter
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((t) => t.category === categoryFilter)
    }

    if (typeFilter.length > 0 && typeFilter.length < ALL_TYPES.length) {
      filtered = filtered.filter((t) => {
        const isIncome =
          t.fromAccount.type === 'income' && t.toAccount.type === 'asset'
        const isExpense =
          t.fromAccount.type === 'asset' && t.toAccount.type === 'expense'
        const isTransfer = !isIncome && !isExpense
        return (
          (typeFilter.includes('income') && isIncome) ||
          (typeFilter.includes('expense') && isExpense) ||
          (typeFilter.includes('transfer') && isTransfer)
        )
      })
    }

    setFilteredTransactions(filtered)
  }, [
    transactions,
    customStartDate,
    customEndDate,
    searchTerm,
    accountFilter,
    typeFilter,
    categoryFilter,
  ])

  return {
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    searchTerm,
    setSearchTerm,
    accountFilter,
    setAccountFilter,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    filteredTransactions,
  }
}
