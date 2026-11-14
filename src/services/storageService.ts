import type { Result } from '@/types/common'
import type { Account } from '@/types/account'
import type { Budget } from '@/types/budget'
import type { Transaction } from '@/types/transaction'
import type { TransactionCategory } from '@/types/transaction'
import type { RecurringTransaction } from '@/types/recurring'
import type { NetWorthSnapshot } from '@/types/netWorth'
import { netEffectsByAccount } from '@/utils/balanceUtils'
import {
  isValidUUID,
  isValidAmount,
  isValidDateString,
  isValidAccountType,
  isValidAccountStatus,
  isValidRecurrenceFrequency,
  isValidRecurringStatus,
} from '@/utils/validationUtils'

/**
 * Storage keys for localStorage
 */
const STORAGE_KEYS = {
  ACCOUNTS: 'moneyflow_accounts',
  BUDGETS: 'moneyflow_budgets',
  CATEGORIES: 'moneyflow_categories',
  RECURRING: 'moneyflow_recurring',
  VERSION: 'moneyflow_version',
  // Partitioned keys — dynamic suffixes _YYYY_MM / _YYYY
  TRANSACTION_PREFIX: 'moneyflow_transactions_',
  NET_WORTH_PREFIX: 'moneyflow_networth_',
  // Legacy monolithic keys — used only for one-time migration
  LEGACY_TRANSACTIONS: 'moneyflow_transactions',
  LEGACY_NET_WORTH: 'moneyflow_networth',
} as const

/**
 * Export data structure
 */
export interface ExportData {
  version: string
  exportedAt: string
  accounts: Account[]
  transactions: Transaction[]
  recurring: RecurringTransaction[]
  netWorthSnapshots: NetWorthSnapshot[]
  // Optional so backups made before these were included still import
  budgets?: Budget[]
  categories?: TransactionCategory[]
}

/**
 * Persisted account shape. Balances are derived from transactions, so only the
 * opening balance is stored — a balance can never drift from its transactions.
 */
type StoredAccount = Omit<Account, 'balance'> & { openingBalance: number }

/**
 * Storage container for each entity type
 */
interface StorageContainer<T> {
  version: string
  data: T[]
}

/**
 * StorageService - Provides type-safe interface to browser localStorage
 */
export class StorageService {
  private readonly version = '1.0.0'

  /**
   * Account Operations
   */

  async getAccounts(): Promise<
    Result<Account[], { type: 'StorageError'; message: string }>
  > {
    try {
      const stored = this.readStoredAccounts()
      const effects = netEffectsByAccount(this.readAllTransactions(), stored)
      const accounts = stored.map(({ openingBalance, ...account }) => ({
        ...account,
        balance: openingBalance + (effects.get(account.id) ?? 0),
      }))
      return { success: true, data: accounts }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to retrieve accounts',
        },
      }
    }
  }

  async getAccount(
    id: string
  ): Promise<Result<Account, { type: 'NotFoundError'; message: string }>> {
    const accountsResult = await this.getAccounts()
    if (!accountsResult.success) {
      return {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Account not found',
        },
      }
    }

    const account = accountsResult.data.find((a) => a.id === id)
    if (!account) {
      return {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Account not found',
        },
      }
    }

    return { success: true, data: account }
  }

  async saveAccount(
    account: Account
  ): Promise<
    Result<
      Account,
      { type: 'ValidationError' | 'StorageError'; message: string }
    >
  > {
    // Validate account
    const validationError = this.validateAccount(account)
    if (validationError) {
      return {
        success: false,
        error: {
          type: 'ValidationError',
          message: validationError,
        },
      }
    }

    try {
      const accounts = this.readStoredAccounts()

      // Setting a balance means "it's this much today": store the opening
      // balance that produces it given the existing transactions
      const effect =
        netEffectsByAccount(this.readAllTransactions(), [account]).get(
          account.id
        ) ?? 0
      const { balance, ...rest } = account
      const stored: StoredAccount = {
        ...rest,
        openingBalance: balance - effect,
      }

      const existingIndex = accounts.findIndex((a) => a.id === account.id)
      if (existingIndex >= 0) {
        accounts[existingIndex] = stored
      } else {
        accounts.push(stored)
      }

      this.setContainer(STORAGE_KEYS.ACCOUNTS, accounts)

      return { success: true, data: account }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error ? error.message : 'Failed to save account',
        },
      }
    }
  }

  async deleteAccount(
    id: string
  ): Promise<
    Result<void, { type: 'NotFoundError' | 'StorageError'; message: string }>
  > {
    try {
      const accounts = this.readStoredAccounts()
      const existingIndex = accounts.findIndex((a) => a.id === id)

      if (existingIndex === -1) {
        return {
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'Account not found',
          },
        }
      }

      accounts.splice(existingIndex, 1)
      this.setContainer(STORAGE_KEYS.ACCOUNTS, accounts)

      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error ? error.message : 'Failed to delete account',
        },
      }
    }
  }

  /**
   * Transaction Operations
   * Transactions are partitioned by month: moneyflow_transactions_YYYY_MM
   */

  async getTransactions(): Promise<
    Result<Transaction[], { type: 'StorageError'; message: string }>
  > {
    try {
      return { success: true, data: this.readAllTransactions() }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to retrieve transactions',
        },
      }
    }
  }

  async getTransaction(
    id: string
  ): Promise<Result<Transaction, { type: 'NotFoundError'; message: string }>> {
    const transactionsResult = await this.getTransactions()
    if (!transactionsResult.success) {
      return {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Transaction not found',
        },
      }
    }

    const transaction = transactionsResult.data.find((t) => t.id === id)
    if (!transaction) {
      return {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Transaction not found',
        },
      }
    }

    return { success: true, data: transaction }
  }

  async saveTransaction(
    transaction: Transaction
  ): Promise<
    Result<
      Transaction,
      { type: 'ValidationError' | 'StorageError'; message: string }
    >
  > {
    const validationError = this.validateTransaction(transaction)
    if (validationError) {
      return {
        success: false,
        error: {
          type: 'ValidationError',
          message: validationError,
        },
      }
    }

    try {
      // Accounts must be on opening balances before the transaction set changes
      this.readStoredAccounts()

      const partitionKey = this.getTransactionPartitionKey(transaction.date)

      // A date edit can move a transaction to another month — drop the old copy
      // so it isn't counted twice
      for (const key of this.getAllTransactionPartitionKeys()) {
        if (key === partitionKey) continue
        const other = this.getContainer<Transaction>(key).data
        if (other.some((t) => t.id === transaction.id)) {
          this.setContainer(
            key,
            other.filter((t) => t.id !== transaction.id)
          )
        }
      }

      const container = this.getContainer<Transaction>(partitionKey)
      const transactions = [...container.data]
      const existingIndex = transactions.findIndex(
        (t) => t.id === transaction.id
      )
      if (existingIndex >= 0) {
        transactions[existingIndex] = transaction
      } else {
        transactions.push(transaction)
      }
      this.setContainer(partitionKey, transactions)
      return { success: true, data: transaction }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to save transaction',
        },
      }
    }
  }

  async deleteTransaction(
    id: string
  ): Promise<
    Result<void, { type: 'NotFoundError' | 'StorageError'; message: string }>
  > {
    try {
      // Accounts must be on opening balances before the transaction set changes
      this.readStoredAccounts()

      const keys = this.getAllTransactionPartitionKeys()
      for (const key of keys) {
        const container = this.getContainer<Transaction>(key)
        const idx = container.data.findIndex((t) => t.id === id)
        if (idx !== -1) {
          const updated = [...container.data]
          updated.splice(idx, 1)
          this.setContainer(key, updated)
          return { success: true, data: undefined }
        }
      }
      return {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Transaction not found',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to delete transaction',
        },
      }
    }
  }

  /**
   * Recurring Transaction Operations
   */

  async getRecurringTransactions(): Promise<
    Result<RecurringTransaction[], { type: 'StorageError'; message: string }>
  > {
    try {
      const container = this.getContainer<RecurringTransaction>(
        STORAGE_KEYS.RECURRING
      )
      return { success: true, data: container.data }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to retrieve recurring transactions',
        },
      }
    }
  }

  async getRecurringTransaction(
    id: string
  ): Promise<
    Result<RecurringTransaction, { type: 'NotFoundError'; message: string }>
  > {
    const recurringResult = await this.getRecurringTransactions()
    if (!recurringResult.success) {
      return {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Recurring transaction not found',
        },
      }
    }

    const recurring = recurringResult.data.find((r) => r.id === id)
    if (!recurring) {
      return {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Recurring transaction not found',
        },
      }
    }

    return { success: true, data: recurring }
  }

  async saveRecurringTransaction(
    recurring: RecurringTransaction
  ): Promise<
    Result<
      RecurringTransaction,
      { type: 'ValidationError' | 'StorageError'; message: string }
    >
  > {
    // Validate recurring transaction
    const validationError = this.validateRecurringTransaction(recurring)
    if (validationError) {
      return {
        success: false,
        error: {
          type: 'ValidationError',
          message: validationError,
        },
      }
    }

    try {
      const recurringResult = await this.getRecurringTransactions()
      const recurrings = recurringResult.success ? recurringResult.data : []

      // Update or add recurring transaction
      const existingIndex = recurrings.findIndex((r) => r.id === recurring.id)
      if (existingIndex >= 0) {
        recurrings[existingIndex] = recurring
      } else {
        recurrings.push(recurring)
      }

      this.setContainer(STORAGE_KEYS.RECURRING, recurrings)

      return { success: true, data: recurring }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to save recurring transaction',
        },
      }
    }
  }

  async deleteRecurringTransaction(
    id: string
  ): Promise<
    Result<void, { type: 'NotFoundError' | 'StorageError'; message: string }>
  > {
    try {
      const recurringResult = await this.getRecurringTransactions()
      if (!recurringResult.success) {
        return {
          success: false,
          error: {
            type: 'StorageError',
            message: 'Failed to retrieve recurring transactions',
          },
        }
      }

      const recurrings = recurringResult.data
      const existingIndex = recurrings.findIndex((r) => r.id === id)

      if (existingIndex === -1) {
        return {
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'Recurring transaction not found',
          },
        }
      }

      recurrings.splice(existingIndex, 1)
      this.setContainer(STORAGE_KEYS.RECURRING, recurrings)

      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to delete recurring transaction',
        },
      }
    }
  }

  /**
   * Net Worth Snapshot Operations
   * Snapshots are partitioned by year: moneyflow_networth_YYYY
   */

  async getNetWorthSnapshots(): Promise<
    Result<NetWorthSnapshot[], { type: 'StorageError'; message: string }>
  > {
    try {
      this.migrateNetWorthIfNeeded()
      const keys = this.getAllNetWorthPartitionKeys()
      const all: NetWorthSnapshot[] = []
      for (const key of keys) {
        const container = this.getContainer<NetWorthSnapshot>(key)
        all.push(...container.data)
      }
      const sorted = all.sort((a, b) => b.date.localeCompare(a.date))
      return { success: true, data: sorted }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to retrieve snapshots',
        },
      }
    }
  }

  async saveNetWorthSnapshot(
    snapshot: NetWorthSnapshot
  ): Promise<
    Result<
      NetWorthSnapshot,
      { type: 'ValidationError' | 'StorageError'; message: string }
    >
  > {
    const validationError = this.validateNetWorthSnapshot(snapshot)
    if (validationError) {
      return {
        success: false,
        error: {
          type: 'ValidationError',
          message: validationError,
        },
      }
    }

    try {
      const partitionKey = this.getNetWorthPartitionKey(snapshot.date)
      const container = this.getContainer<NetWorthSnapshot>(partitionKey)
      // Keep exactly one snapshot per date within this year's partition
      const normalized = container.data.filter(
        (item) => item.date !== snapshot.date && item.id !== snapshot.id
      )
      normalized.push(snapshot)
      this.setContainer(partitionKey, normalized)
      return { success: true, data: snapshot }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error ? error.message : 'Failed to save snapshot',
        },
      }
    }
  }

  async getBudgets(): Promise<
    Result<Budget[], { type: 'StorageError'; message: string }>
  > {
    try {
      return {
        success: true,
        data: this.getContainer<Budget>(STORAGE_KEYS.BUDGETS).data,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to retrieve budgets',
        },
      }
    }
  }

  async saveBudget(
    budget: Budget
  ): Promise<Result<Budget, { type: 'StorageError'; message: string }>> {
    try {
      const result = await this.getBudgets()
      const budgets = result.success ? result.data : []
      const index = budgets.findIndex((item) => item.id === budget.id)
      if (index >= 0) budgets[index] = budget
      else budgets.push(budget)
      this.setContainer(STORAGE_KEYS.BUDGETS, budgets)
      return { success: true, data: budget }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error ? error.message : 'Failed to save budget',
        },
      }
    }
  }

  async deleteBudget(
    id: string
  ): Promise<Result<void, { type: 'StorageError'; message: string }>> {
    try {
      const result = await this.getBudgets()
      const budgets = result.success ? result.data : []
      this.setContainer(
        STORAGE_KEYS.BUDGETS,
        budgets.filter((item) => item.id !== id)
      )
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error ? error.message : 'Failed to delete budget',
        },
      }
    }
  }

  async getCategories(): Promise<
    Result<TransactionCategory[], { type: 'StorageError'; message: string }>
  > {
    try {
      return {
        success: true,
        data: this.getContainer<TransactionCategory>(STORAGE_KEYS.CATEGORIES)
          .data,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to retrieve categories',
        },
      }
    }
  }

  async saveCategory(
    category: TransactionCategory
  ): Promise<
    Result<TransactionCategory, { type: 'StorageError'; message: string }>
  > {
    try {
      const result = await this.getCategories()
      const categories = result.success ? result.data : []
      const index = categories.findIndex((item) => item.id === category.id)
      if (index >= 0) categories[index] = category
      else categories.push(category)
      this.setContainer(STORAGE_KEYS.CATEGORIES, categories)
      return { success: true, data: category }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error ? error.message : 'Failed to save category',
        },
      }
    }
  }

  async deleteCategory(
    id: string
  ): Promise<Result<void, { type: 'StorageError'; message: string }>> {
    try {
      const result = await this.getCategories()
      const categories = result.success ? result.data : []
      this.setContainer(
        STORAGE_KEYS.CATEGORIES,
        categories.filter((item) => item.id !== id)
      )
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to delete category',
        },
      }
    }
  }

  /**
   * Bulk Operations
   */

  async exportData(): Promise<
    Result<ExportData, { type: 'StorageError'; message: string }>
  > {
    try {
      const accountsResult = await this.getAccounts()
      const transactionsResult = await this.getTransactions()
      const recurringResult = await this.getRecurringTransactions()
      const snapshotsResult = await this.getNetWorthSnapshots()
      const budgetsResult = await this.getBudgets()
      const categoriesResult = await this.getCategories()

      const exportData: ExportData = {
        version: this.version,
        exportedAt: new Date().toISOString(),
        accounts: accountsResult.success ? accountsResult.data : [],
        transactions: transactionsResult.success ? transactionsResult.data : [],
        recurring: recurringResult.success ? recurringResult.data : [],
        netWorthSnapshots: snapshotsResult.success ? snapshotsResult.data : [],
        budgets: budgetsResult.success ? budgetsResult.data : [],
        categories: categoriesResult.success ? categoriesResult.data : [],
      }

      return { success: true, data: exportData }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error ? error.message : 'Failed to export data',
        },
      }
    }
  }

  async importData(
    data: ExportData
  ): Promise<
    Result<void, { type: 'ValidationError' | 'StorageError'; message: string }>
  > {
    try {
      // Validate import data structure
      if (
        !data.version ||
        !data.accounts ||
        !data.transactions ||
        !data.recurring ||
        !data.netWorthSnapshots
      ) {
        return {
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid import data structure',
          },
        }
      }

      // Validate each account
      for (const account of data.accounts) {
        const error = this.validateAccount(account)
        if (error) {
          return {
            success: false,
            error: {
              type: 'ValidationError',
              message: `Invalid account data: ${error}`,
            },
          }
        }
      }

      // Validate each transaction
      for (const transaction of data.transactions) {
        const error = this.validateTransaction(transaction)
        if (error) {
          return {
            success: false,
            error: {
              type: 'ValidationError',
              message: `Invalid transaction data: ${error}`,
            },
          }
        }
      }

      // Validate each recurring transaction
      for (const recurring of data.recurring) {
        const error = this.validateRecurringTransaction(recurring)
        if (error) {
          return {
            success: false,
            error: {
              type: 'ValidationError',
              message: `Invalid recurring transaction data: ${error}`,
            },
          }
        }
      }

      // Validate each snapshot
      for (const snapshot of data.netWorthSnapshots) {
        const error = this.validateNetWorthSnapshot(snapshot)
        if (error) {
          return {
            success: false,
            error: {
              type: 'ValidationError',
              message: `Invalid snapshot data: ${error}`,
            },
          }
        }
      }

      for (const budget of data.budgets ?? []) {
        const error = this.validateBudget(budget)
        if (error) {
          return {
            success: false,
            error: {
              type: 'ValidationError',
              message: `Invalid budget data: ${error}`,
            },
          }
        }
      }

      for (const category of data.categories ?? []) {
        if (
          typeof category?.id !== 'string' ||
          typeof category?.name !== 'string'
        ) {
          return {
            success: false,
            error: {
              type: 'ValidationError',
              message: 'Invalid category data: missing id or name',
            },
          }
        }
      }

      // Keep a copy of current data so a failed write (e.g. quota) can't leave it wiped
      const previous = this.snapshotAppData()
      try {
        await this.clearAllData()
        this.writeImportedData(data)
      } catch (error) {
        this.restoreAppData(previous)
        throw error
      }

      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error ? error.message : 'Failed to import data',
        },
      }
    }
  }

  private writeImportedData(data: ExportData): void {
    this.setContainer(STORAGE_KEYS.ACCOUNTS, data.accounts)
    this.setContainer(STORAGE_KEYS.RECURRING, data.recurring)
    this.setContainer(STORAGE_KEYS.BUDGETS, data.budgets ?? [])
    this.setContainer(STORAGE_KEYS.CATEGORIES, data.categories ?? [])

    // Import transactions grouped by month
    const txByMonth: Record<string, Transaction[]> = {}
    for (const tx of data.transactions) {
      const key = this.getTransactionPartitionKey(tx.date)
      if (!txByMonth[key]) txByMonth[key] = []
      txByMonth[key].push(tx)
    }
    for (const [key, txs] of Object.entries(txByMonth)) {
      this.setContainer(key, txs)
    }

    // Import net worth snapshots grouped by year
    const nwByYear: Record<string, NetWorthSnapshot[]> = {}
    for (const snap of data.netWorthSnapshots) {
      const key = this.getNetWorthPartitionKey(snap.date)
      if (!nwByYear[key]) nwByYear[key] = []
      nwByYear[key].push(snap)
    }
    for (const [key, snaps] of Object.entries(nwByYear)) {
      this.setContainer(key, snaps)
    }
  }

  /** All of this app's localStorage entries, keyed by storage key */
  private snapshotAppData(): Record<string, string> {
    const snapshot: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('moneyflow_')) {
        snapshot[key] = localStorage.getItem(key) ?? ''
      }
    }
    return snapshot
  }

  private restoreAppData(snapshot: Record<string, string>): void {
    for (const key of Object.keys(this.snapshotAppData())) {
      localStorage.removeItem(key)
    }
    for (const [key, value] of Object.entries(snapshot)) {
      localStorage.setItem(key, value)
    }
  }

  async clearAllData(): Promise<
    Result<void, { type: 'StorageError'; message: string }>
  > {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCOUNTS)
      localStorage.removeItem(STORAGE_KEYS.BUDGETS)
      localStorage.removeItem(STORAGE_KEYS.CATEGORIES)
      localStorage.removeItem(STORAGE_KEYS.RECURRING)
      // Remove all transaction month partitions
      for (const key of this.getAllTransactionPartitionKeys()) {
        localStorage.removeItem(key)
      }
      // Remove all net worth year partitions
      for (const key of this.getAllNetWorthPartitionKeys()) {
        localStorage.removeItem(key)
      }
      // Remove legacy monolithic keys if they exist
      localStorage.removeItem(STORAGE_KEYS.LEGACY_TRANSACTIONS)
      localStorage.removeItem(STORAGE_KEYS.LEGACY_NET_WORTH)
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'StorageError',
          message:
            error instanceof Error ? error.message : 'Failed to clear data',
        },
      }
    }
  }

  /**
   * Private Helper Methods
   */

  private readAllTransactions(): Transaction[] {
    this.migrateTransactionsIfNeeded()
    const all: Transaction[] = []
    for (const key of this.getAllTransactionPartitionKeys()) {
      all.push(...this.getContainer<Transaction>(key).data)
    }
    return all
  }

  /**
   * Stored accounts, converting any that still hold a running `balance`
   * (written before balances were derived, or imported from a backup).
   * Their opening balance is backed out from the current transactions,
   * so every balance reads exactly as it did before conversion.
   */
  private readStoredAccounts(): StoredAccount[] {
    const raw = this.getContainer<StoredAccount | Account>(
      STORAGE_KEYS.ACCOUNTS
    ).data
    const isStored = (a: StoredAccount | Account): a is StoredAccount =>
      'openingBalance' in a
    if (raw.every(isStored)) return raw

    const effects = netEffectsByAccount(this.readAllTransactions(), raw)
    const converted = raw.map((a): StoredAccount => {
      if (isStored(a)) return a
      const { balance, ...rest } = a
      return { ...rest, openingBalance: balance - (effects.get(a.id) ?? 0) }
    })
    this.setContainer(STORAGE_KEYS.ACCOUNTS, converted)
    return converted
  }

  private getContainer<T>(key: string): StorageContainer<T> {
    try {
      const item = localStorage.getItem(key)
      if (!item) {
        return {
          version: this.version,
          data: [],
        }
      }

      const parsed = JSON.parse(item)
      return {
        version: parsed.version || this.version,
        data: parsed.data || [],
      }
    } catch (error) {
      throw new Error(
        `Failed to parse storage data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private setContainer<T>(key: string, data: T[]): void {
    try {
      const container: StorageContainer<T> = {
        version: this.version,
        data,
      }
      localStorage.setItem(key, JSON.stringify(container))
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('QuotaExceededError')
      ) {
        throw new Error('Storage quota exceeded. Please free up space.')
      }
      throw new Error(
        `Failed to save to storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // ─── Partition Key Helpers ───────────────────────────────────────────────

  private getTransactionPartitionKey(date: string): string {
    const [year, month] = date.split('-')
    return `${STORAGE_KEYS.TRANSACTION_PREFIX}${year}_${month}`
  }

  private getNetWorthPartitionKey(date: string): string {
    const year = date.split('-')[0]
    return `${STORAGE_KEYS.NET_WORTH_PREFIX}${year}`
  }

  private getAllTransactionPartitionKeys(): string[] {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && /^moneyflow_transactions_\d{4}_\d{2}$/.test(key)) {
        keys.push(key)
      }
    }
    return keys.sort()
  }

  private getAllNetWorthPartitionKeys(): string[] {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && /^moneyflow_networth_\d{4}$/.test(key)) {
        keys.push(key)
      }
    }
    return keys.sort()
  }

  // ─── One-Time Migrations ──────────────────────────────────────────────────

  private migrateTransactionsIfNeeded(): void {
    const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY_TRANSACTIONS)
    if (!legacy) return
    try {
      const parsed = JSON.parse(legacy)
      const transactions: Transaction[] = parsed.data ?? []
      const byMonth: Record<string, Transaction[]> = {}
      for (const tx of transactions) {
        const key = this.getTransactionPartitionKey(tx.date)
        if (!byMonth[key]) byMonth[key] = []
        byMonth[key].push(tx)
      }
      for (const [key, txs] of Object.entries(byMonth)) {
        this.setContainer(key, txs)
      }
      localStorage.removeItem(STORAGE_KEYS.LEGACY_TRANSACTIONS)
    } catch {
      // Leave legacy key in place if migration fails
    }
  }

  private migrateNetWorthIfNeeded(): void {
    const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY_NET_WORTH)
    if (!legacy) return
    try {
      const parsed = JSON.parse(legacy)
      const snapshots: NetWorthSnapshot[] = parsed.data ?? []
      const byYear: Record<string, NetWorthSnapshot[]> = {}
      for (const snap of snapshots) {
        const key = this.getNetWorthPartitionKey(snap.date)
        if (!byYear[key]) byYear[key] = []
        byYear[key].push(snap)
      }
      for (const [key, snaps] of Object.entries(byYear)) {
        this.setContainer(key, snaps)
      }
      localStorage.removeItem(STORAGE_KEYS.LEGACY_NET_WORTH)
    } catch {
      // Leave legacy key in place if migration fails
    }
  }

  // ─── Validators ───────────────────────────────────────────────────────────

  private validateAccount(account: Account): string | null {
    if (!isValidUUID(account.id)) {
      return 'Invalid account ID'
    }
    if (
      !account.name ||
      account.name.length === 0 ||
      account.name.length > 100
    ) {
      return 'Account name must be 1-100 characters'
    }
    if (!isValidAccountType(account.type)) {
      return 'Invalid account type'
    }
    if (!isValidAmount(account.balance, { allowNegative: true })) {
      return 'Invalid account balance'
    }
    if (!isValidAccountStatus(account.status)) {
      return 'Invalid account status'
    }
    if (!isValidDateString(account.createdAt)) {
      return 'Invalid createdAt date'
    }
    if (!isValidDateString(account.updatedAt)) {
      return 'Invalid updatedAt date'
    }
    return null
  }

  private validateTransaction(transaction: Transaction): string | null {
    if (!isValidUUID(transaction.id)) {
      return 'Invalid transaction ID'
    }
    if (!isValidUUID(transaction.fromAccountId)) {
      return 'Invalid fromAccountId'
    }
    if (!isValidUUID(transaction.toAccountId)) {
      return 'Invalid toAccountId'
    }
    if (!isValidAmount(transaction.amount, { allowZero: false })) {
      return 'Invalid transaction amount'
    }
    if (!transaction.description || transaction.description.length === 0) {
      return 'Transaction description is required'
    }
    if (!isValidDateString(transaction.date)) {
      return 'Invalid transaction date'
    }
    if (!isValidDateString(transaction.createdAt)) {
      return 'Invalid createdAt date'
    }
    return null
  }

  private validateRecurringTransaction(
    recurring: RecurringTransaction
  ): string | null {
    if (!isValidUUID(recurring.id)) {
      return 'Invalid recurring transaction ID'
    }
    if (!isValidUUID(recurring.fromAccountId)) {
      return 'Invalid fromAccountId'
    }
    if (!isValidUUID(recurring.toAccountId)) {
      return 'Invalid toAccountId'
    }
    if (!isValidAmount(recurring.amount, { allowZero: false })) {
      return 'Invalid amount'
    }
    if (!recurring.description || recurring.description.length === 0) {
      return 'Description is required'
    }
    if (!isValidRecurrenceFrequency(recurring.frequency)) {
      return 'Invalid recurrence frequency'
    }
    if (!isValidRecurringStatus(recurring.status)) {
      return 'Invalid recurring status'
    }
    if (
      recurring.lastProcessedDate &&
      !isValidDateString(recurring.lastProcessedDate)
    ) {
      return 'Invalid lastProcessedDate'
    }
    if (!isValidDateString(recurring.createdAt)) {
      return 'Invalid createdAt date'
    }
    if (!isValidDateString(recurring.updatedAt)) {
      return 'Invalid updatedAt date'
    }
    return null
  }

  private validateBudget(budget: Budget): string | null {
    if (typeof budget?.id !== 'string') return 'Invalid budget ID'
    if (typeof budget.category !== 'string') return 'Invalid budget category'
    if (!isValidAmount(budget.amount) || budget.amount <= 0) {
      return 'Invalid budget amount'
    }
    if (!['weekly', 'monthly', 'yearly'].includes(budget.period)) {
      return 'Invalid budget period'
    }
    return null
  }

  private validateNetWorthSnapshot(snapshot: NetWorthSnapshot): string | null {
    if (!isValidUUID(snapshot.id)) {
      return 'Invalid snapshot ID'
    }
    if (!isValidDateString(snapshot.date)) {
      return 'Invalid snapshot date'
    }
    if (!isValidAmount(snapshot.totalAssets, { allowNegative: true })) {
      return 'Invalid totalAssets'
    }
    if (!isValidAmount(snapshot.totalLiabilities, { allowNegative: true })) {
      return 'Invalid totalLiabilities'
    }
    if (!isValidAmount(snapshot.netWorth, { allowNegative: true })) {
      return 'Invalid netWorth'
    }
    if (!isValidDateString(snapshot.createdAt)) {
      return 'Invalid createdAt date'
    }
    return null
  }
}

// ── Local storage singleton ───────────────────────────────────────────────────

const storage = new StorageService()

export const getAccounts = () => storage.getAccounts()
export const getAccount = (id: string) => storage.getAccount(id)
export const saveAccount = (account: Account) => storage.saveAccount(account)
export const deleteAccount = (id: string) => storage.deleteAccount(id)
export const getTransactions = () => storage.getTransactions()
export const getTransaction = (id: string) => storage.getTransaction(id)
export const saveTransaction = (transaction: Transaction) =>
  storage.saveTransaction(transaction)
export const deleteTransaction = (id: string) => storage.deleteTransaction(id)
export const getRecurringTransactions = () => storage.getRecurringTransactions()
export const getRecurringTransaction = (id: string) =>
  storage.getRecurringTransaction(id)
export const saveRecurringTransaction = (recurring: RecurringTransaction) =>
  storage.saveRecurringTransaction(recurring)
export const deleteRecurringTransaction = (id: string) =>
  storage.deleteRecurringTransaction(id)
export const getNetWorthSnapshots = () => storage.getNetWorthSnapshots()
export const saveNetWorthSnapshot = (snapshot: NetWorthSnapshot) =>
  storage.saveNetWorthSnapshot(snapshot)
export const exportData = () => storage.exportData()
export const importData = (data: ExportData) => storage.importData(data)
export const clearAllData = () => storage.clearAllData()
export const getBudgets = () => storage.getBudgets()
export const saveBudget = (budget: import('@/types/budget').Budget) =>
  storage.saveBudget(budget)
export const deleteBudget = (id: string) => storage.deleteBudget(id)
export const getCategories = () => storage.getCategories()
export const saveCategory = (
  category: import('@/types/transaction').TransactionCategory
) => storage.saveCategory(category)
export const deleteCategory = (id: string) => storage.deleteCategory(id)
