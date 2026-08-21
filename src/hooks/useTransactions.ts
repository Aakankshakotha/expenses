import { useState, useEffect } from 'react'
import * as transactionService from '@/services/transactionService'
import * as accountService from '@/services/accountService'
import type {
  TransactionWithAccounts,
  CreateTransactionDto,
  UpdateTransactionDto,
} from '@/types/transaction'
import type { Account } from '@/types/account'

export interface UseTransactionsReturn {
  transactions: TransactionWithAccounts[]
  accounts: Account[]
  loading: boolean
  error: string | null
  isFormOpen: boolean
  openForm: () => void
  closeForm: () => void
  editingTransaction: TransactionWithAccounts | null
  openEditForm: (transaction: TransactionWithAccounts) => void
  closeEditForm: () => void
  handleCreateTransaction: (data: CreateTransactionDto) => Promise<void>
  handleUpdateTransaction: (
    id: string,
    data: UpdateTransactionDto
  ) => Promise<void>
  handleDeleteTransaction: (
    transaction: TransactionWithAccounts
  ) => Promise<void>
}

export const useTransactions = (): UseTransactionsReturn => {
  const [transactions, setTransactions] = useState<TransactionWithAccounts[]>(
    []
  )
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithAccounts | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [accountsResult, transactionsResult] = await Promise.all([
        accountService.listAccounts(),
        transactionService.listTransactions(),
      ])

      if (!accountsResult.success) {
        setError('Failed to load accounts')
        setLoading(false)
        return
      }
      setAccounts(accountsResult.data)

      if (!transactionsResult.success) {
        setError('Failed to load transactions')
        setLoading(false)
        return
      }

      const enriched = transactionsResult.data
        .map((txn) => {
          const fromAccount = accountsResult.data.find(
            (a) => a.id === txn.fromAccountId
          )
          const toAccount = accountsResult.data.find(
            (a) => a.id === txn.toAccountId
          )
          if (!fromAccount || !toAccount) return null
          return { ...txn, fromAccount, toAccount } as TransactionWithAccounts
        })
        .filter((t): t is TransactionWithAccounts => t !== null)

      setTransactions(enriched)
    } catch {
      setError('Failed to load transaction data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTransaction = async (
    data: CreateTransactionDto
  ): Promise<void> => {
    const result = await transactionService.recordTransaction(data)
    if (!result.success) throw new Error(result.error.message)
    await loadData()
  }

  const handleUpdateTransaction = async (
    id: string,
    data: UpdateTransactionDto
  ): Promise<void> => {
    const result = await transactionService.updateTransaction(id, data)
    if (!result.success) throw new Error(result.error.message)
    await loadData()
  }

  const handleDeleteTransaction = async (
    transaction: TransactionWithAccounts
  ): Promise<void> => {
    if (!confirm('Are you sure you want to delete this transaction?')) return
    const result = await transactionService.deleteTransaction(transaction.id)
    if (!result.success) {
      alert(`Failed to delete transaction: ${result.error.message}`)
      return
    }
    await loadData()
  }

  return {
    transactions,
    accounts,
    loading,
    error,
    isFormOpen,
    openForm: () => setIsFormOpen(true),
    closeForm: () => setIsFormOpen(false),
    editingTransaction,
    openEditForm: (txn) => setEditingTransaction(txn),
    closeEditForm: () => setEditingTransaction(null),
    handleCreateTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
  }
}
