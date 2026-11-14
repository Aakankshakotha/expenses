import type {
  Result,
  ValidationError,
  NotFoundError,
  BusinessRuleError,
  StorageError,
} from '@/types/common'
import type {
  Transaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionFilter,
} from '@/types/transaction'
import { validateCreateTransaction } from './validationService'
import * as storageService from './storageService'
import * as accountService from './accountService'

/**
 * Record a new transaction
 * Creates a transaction; account balances follow from it automatically
 */
export async function recordTransaction(
  data: CreateTransactionDto
): Promise<
  Result<Transaction, ValidationError | NotFoundError | BusinessRuleError>
> {
  // Validate input
  const validationResult = validateCreateTransaction(data)
  if (!validationResult.success) {
    return validationResult
  }

  // Get both accounts
  const fromAccountResult = await accountService.getAccount(data.fromAccountId)
  if (!fromAccountResult.success) {
    return {
      success: false,
      error: {
        field: 'fromAccountId',
        message: 'Source account not found',
        code: 'NOT_FOUND',
      },
    }
  }

  const toAccountResult = await accountService.getAccount(data.toAccountId)
  if (!toAccountResult.success) {
    return {
      success: false,
      error: {
        field: 'toAccountId',
        message: 'Destination account not found',
        code: 'NOT_FOUND',
      },
    }
  }

  const fromAccount = fromAccountResult.data
  const toAccount = toAccountResult.data

  if (fromAccount.type === 'expense') {
    return {
      success: false,
      error: {
        message: 'Expense accounts can only be destination accounts',
        code: 'INVALID_DIRECTION',
      },
    }
  }

  if (toAccount.type === 'income') {
    return {
      success: false,
      error: {
        message: 'Income accounts can only be source accounts',
        code: 'INVALID_DIRECTION',
      },
    }
  }

  // Check if from account has sufficient balance.
  // Liability accounts (credit cards, loans) have no balance check — spending just increases what is owed.
  // Income accounts are source-only virtual accounts, also exempt.
  if (
    fromAccount.type !== 'income' &&
    fromAccount.type !== 'liability' &&
    fromAccount.balance < data.amount
  ) {
    return {
      success: false,
      error: {
        message: 'Insufficient balance in source account',
        code: 'INSUFFICIENT_BALANCE',
      },
    }
  }

  // Create transaction
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    fromAccountId: data.fromAccountId,
    toAccountId: data.toAccountId,
    amount: data.amount,
    description: data.description,
    date: data.date,
    category: data.category,
    tags: data.tags,
    createdAt: new Date().toISOString(),
  }

  // Balances are derived from transactions, so this single write is the whole change
  const saveResult = await storageService.saveTransaction(transaction)

  if (!saveResult.success) {
    return {
      success: false,
      error: {
        message: 'Failed to save transaction',
        code: 'STORAGE_ERROR',
      },
    }
  }

  return {
    success: true,
    data: transaction,
  }
}

/**
 * List transactions with optional filtering
 */
export async function listTransactions(
  filter?: TransactionFilter
): Promise<Result<Transaction[], StorageError>> {
  const transactionsResult = await storageService.getTransactions()

  if (!transactionsResult.success) {
    return {
      success: false,
      error: {
        code: 'STORAGE_ERROR',
        message: 'Failed to load transactions',
        details: transactionsResult.error.message,
      },
    }
  }

  let transactions = transactionsResult.data

  // Apply filters
  if (filter) {
    if (filter.accountId) {
      transactions = transactions.filter(
        (txn) =>
          txn.fromAccountId === filter.accountId ||
          txn.toAccountId === filter.accountId
      )
    }

    if (filter.fromAccountId) {
      transactions = transactions.filter(
        (txn) => txn.fromAccountId === filter.fromAccountId
      )
    }

    if (filter.toAccountId) {
      transactions = transactions.filter(
        (txn) => txn.toAccountId === filter.toAccountId
      )
    }

    if (filter.startDate) {
      transactions = transactions.filter((txn) => txn.date >= filter.startDate!)
    }

    if (filter.endDate) {
      transactions = transactions.filter((txn) => txn.date <= filter.endDate!)
    }

    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase()
      transactions = transactions.filter((txn) =>
        txn.description.toLowerCase().includes(term)
      )
    }
  }

  // Sort by date descending (most recent first)
  const sorted = [...transactions].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.createdAt.localeCompare(a.createdAt)
  })

  return {
    success: true,
    data: sorted,
  }
}

/**
 * Get a single transaction by ID
 */
export async function getTransaction(
  id: string
): Promise<Result<Transaction, NotFoundError | StorageError>> {
  const result = await storageService.getTransaction(id)

  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: result.error.message,
      },
    }
  }

  return result
}

/**
 * Delete a transaction; account balances follow from it automatically
 */
export async function deleteTransaction(
  id: string
): Promise<Result<void, NotFoundError | BusinessRuleError>> {
  // Get transaction
  const transactionResult = await storageService.getTransaction(id)

  if (!transactionResult.success) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Transaction not found',
      },
    }
  }

  // Delete transaction
  const deleteResult = await storageService.deleteTransaction(id)

  if (!deleteResult.success) {
    return {
      success: false,
      error: {
        message: 'Failed to delete transaction',
        code: 'DELETE_FAILED',
      },
    }
  }

  return {
    success: true,
    data: undefined,
  }
}

/**
 * Update editable fields of a transaction.
 * Balances are derived from transactions, so moving it to other accounts
 * needs no balance bookkeeping — only that the new accounts exist.
 */
export async function updateTransaction(
  id: string,
  updates: UpdateTransactionDto
): Promise<
  Result<
    Transaction,
    NotFoundError | StorageError | ValidationError | BusinessRuleError
  >
> {
  const transactionResult = await storageService.getTransaction(id)

  if (!transactionResult.success) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Transaction not found' },
    }
  }

  const original = transactionResult.data
  const newFromAccountId = updates.fromAccountId ?? original.fromAccountId
  const newToAccountId = updates.toAccountId ?? original.toAccountId
  const newAmount = updates.amount ?? original.amount
  const accountsChanged =
    newFromAccountId !== original.fromAccountId ||
    newToAccountId !== original.toAccountId

  if (
    updates.amount !== undefined &&
    (!Number.isInteger(newAmount) || newAmount <= 0)
  ) {
    return {
      success: false,
      error: {
        field: 'amount',
        message: 'Amount must be greater than 0',
        code: 'INVALID_AMOUNT',
      },
    }
  }

  if (accountsChanged || newAmount !== original.amount) {
    const [newFrom, newTo] = await Promise.all([
      accountService.getAccount(newFromAccountId),
      accountService.getAccount(newToAccountId),
    ])
    if (!newFrom.success) {
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Source account not found' },
      }
    }
    if (!newTo.success) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Destination account not found',
        },
      }
    }

    // Same rule as recording: an asset can't pay out more than it holds.
    // Its balance already reflects this transaction, so add that back first.
    const fromAccount = newFrom.data
    const available =
      fromAccount.balance +
      (fromAccount.id === original.fromAccountId ? original.amount : 0)
    if (fromAccount.type === 'asset' && available < newAmount) {
      return {
        success: false,
        error: {
          message: 'Insufficient balance in source account',
          code: 'INSUFFICIENT_BALANCE',
        },
      }
    }
  }

  const updated: Transaction = {
    ...original,
    fromAccountId: newFromAccountId,
    toAccountId: newToAccountId,
    amount: newAmount,
    ...(updates.description !== undefined && {
      description: updates.description,
    }),
    ...(updates.date !== undefined && { date: updates.date }),
    ...(updates.category !== undefined && { category: updates.category }),
    ...(updates.tags !== undefined && { tags: updates.tags }),
  }

  const saveResult = await storageService.saveTransaction(updated)

  if (!saveResult.success) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: 'Failed to save transaction' },
    }
  }

  return { success: true, data: updated }
}
