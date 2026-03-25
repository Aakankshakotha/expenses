/**
 * DriveStorageService
 * Stores all MoneyFlow data in the user's own Google Drive.
 * Each user gets a "MoneyFlow/" folder containing JSON files.
 *
 * File layout:
 *   MoneyFlow/
 *     accounts.json
 *     recurring.json
 *     investments.json
 *     transactions_YYYY_MM.json  (one per calendar month)
 *     networth_YYYY.json         (one per calendar year)
 *
 * Security: All requests are proxied through Next.js Route Handlers at
 * /api/drive/**. The Google Drive access token is stored in an HTTP-only
 * cookie managed by the server — it is NEVER accessible to client JavaScript.
 *
 * Public method signatures are identical to the old StorageService so the
 * rest of the codebase requires zero changes.
 */

import type { Result } from '@/types/common'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import type { RecurringTransaction } from '@/types/recurring'
import type { NetWorthSnapshot } from '@/types/netWorth'
import type { InvestmentSnapshot } from '@/types/investment'
import {
  isValidUUID,
  isValidAmount,
  isValidDateString,
  isValidAccountType,
  isValidAccountStatus,
  isValidRecurrenceFrequency,
  isValidRecurringStatus,
} from '@/utils/validationUtils'

export interface ExportData {
  version: string
  exportedAt: string
  accounts: Account[]
  transactions: Transaction[]
  recurring: RecurringTransaction[]
  netWorthSnapshots: NetWorthSnapshot[]
}

// ── Constants ────────────────────────────────────────────────────────────────

// All Drive requests are proxied server-side through Next.js Route Handlers.
// The actual googleapis.com/drive URL is reconstructed in /api/drive/[...path].
const DRIVE_API = '/api/drive/v3'
const DRIVE_UPLOAD_API = '/api/drive/upload/v3'
const FOLDER_NAME = 'MoneyFlow'
const BOUNDARY = 'moneyflow_multipart_boundary'
const VERSION = '1.0.0'

// ── Helpers ──────────────────────────────────────────────────────────────────

function tokenExpiredError(): Error {
  const err = new Error('Google session expired. Please sign in again.')
  ;(err as Error & { code: string }).code = 'TOKEN_EXPIRED'
  // Notify the app shell so it can silently refresh or prompt re-login
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('moneyflow:token-expired'))
  }
  return err
}

function txFileName(date: string): string {
  const [year, month] = date.split('-')
  return `transactions_${year}_${month}.json`
}

function nwFileName(date: string): string {
  return `networth_${date.split('-')[0]}.json`
}

function buildMultipart(metadata: object, content: string): string {
  return [
    `--${BOUNDARY}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${BOUNDARY}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    content,
    `--${BOUNDARY}--`,
  ].join('\r\n')
}

// ── DriveStorageService ──────────────────────────────────────────────────────

export class DriveStorageService {
  // No access token stored client-side — the token lives in an HTTP-only
  // cookie and is attached by the /api/drive/* server-side proxy.
  private folderId: string | null = null
  private fileIdCache = new Map<string, string>()
  private cacheWarmed = false
  // Content cache: file name → parsed array. Serves reads from memory after
  // the first Drive fetch. Writes update this cache so subsequent reads on
  // the same page navigation are also instant.
  private contentCache = new Map<string, unknown[]>()

  // ── Folder & file ID resolution ────────────────────────────────────────────

  private async ensureFolder(): Promise<string> {
    if (this.folderId) return this.folderId

    const q = encodeURIComponent(
      `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    )
    const res = await fetch(`${DRIVE_API}/files?q=${q}&fields=files(id)`, {
      credentials: 'include',
    })

    if (res.status === 401) throw tokenExpiredError()
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`)

    const data = await res.json()
    if (data.files?.length > 0) {
      this.folderId = data.files[0].id as string
      return this.folderId
    }

    // Create the folder
    const createRes = await fetch(`${DRIVE_API}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    })
    if (createRes.status === 401) throw tokenExpiredError()
    if (!createRes.ok)
      throw new Error(`Drive create folder error: ${createRes.status}`)

    const folder = await createRes.json()
    this.folderId = folder.id as string
    return this.folderId
  }

  /**
   * Fetches and caches all file IDs in the MoneyFlow folder at once.
   * Subsequent lookups are served from the in-memory map.
   */
  private async warmCache(): Promise<void> {
    if (this.cacheWarmed) return
    const folderId = await this.ensureFolder()
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
    const res = await fetch(
      `${DRIVE_API}/files?q=${q}&fields=files(id,name)&pageSize=1000`,
      { credentials: 'include' }
    )
    if (res.status === 401) throw tokenExpiredError()
    if (!res.ok) throw new Error(`Drive list error: ${res.status}`)

    const data = await res.json()
    for (const file of (data.files as Array<{ id: string; name: string }>) ??
      []) {
      this.fileIdCache.set(file.name, file.id)
    }
    this.cacheWarmed = true
  }

  // ── Low-level read / write ─────────────────────────────────────────────────

  private async readFile<T>(fileName: string): Promise<T[]> {
    // Serve from in-memory cache — avoids a Drive round-trip on every re-render
    if (this.contentCache.has(fileName)) {
      return this.contentCache.get(fileName) as T[]
    }

    await this.warmCache()
    const fileId = this.fileIdCache.get(fileName)
    if (!fileId) {
      this.contentCache.set(fileName, [])
      return []
    }

    const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      credentials: 'include',
    })
    if (res.status === 401) throw tokenExpiredError()
    if (!res.ok) {
      this.contentCache.set(fileName, [])
      return []
    }

    const data = await res.json()
    const result = (data.data as T[]) ?? []
    this.contentCache.set(fileName, result as unknown[])
    return result
  }

  private async writeFile<T>(fileName: string, data: T[]): Promise<void> {
    await this.warmCache()
    const folderId = await this.ensureFolder()
    const content = JSON.stringify({ version: VERSION, data })
    const existingId = this.fileIdCache.get(fileName)

    if (existingId) {
      // Update existing file — PATCH with empty metadata + new content
      const body = buildMultipart({}, content)
      const res = await fetch(
        `${DRIVE_UPLOAD_API}/files/${existingId}?uploadType=multipart`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': `multipart/related; boundary="${BOUNDARY}"`,
          },
          credentials: 'include',
          body,
        }
      )
      if (res.status === 401) throw tokenExpiredError()
    } else {
      // Create new file — POST with name/parents metadata + content
      const body = buildMultipart(
        { name: fileName, mimeType: 'application/json', parents: [folderId] },
        content
      )
      const res = await fetch(
        `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/related; boundary="${BOUNDARY}"`,
          },
          credentials: 'include',
          body,
        }
      )
      if (res.status === 401) throw tokenExpiredError()
      if (!res.ok) throw new Error(`Drive create file error: ${res.status}`)

      const created = await res.json()
      this.fileIdCache.set(fileName, created.id as string)
    }

    // Update content cache so next read is instant
    this.contentCache.set(fileName, data as unknown[])
  }

  private async deleteFile(fileName: string): Promise<void> {
    await this.warmCache()
    const fileId = this.fileIdCache.get(fileName)
    if (!fileId) return

    await fetch(`${DRIVE_API}/files/${fileId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    this.fileIdCache.delete(fileName)
    this.contentCache.delete(fileName)
  }

  // ── Error wrapping helper ──────────────────────────────────────────────────

  private storageErr(message: string) {
    return { type: 'StorageError' as const, message }
  }

  // ── Account Operations ─────────────────────────────────────────────────────

  async getAccounts(): Promise<
    Result<Account[], { type: 'StorageError'; message: string }>
  > {
    try {
      const data = await this.readFile<Account>('accounts.json')
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error ? error.message : 'Failed to retrieve accounts'
        ),
      }
    }
  }

  async getAccount(
    id: string
  ): Promise<Result<Account, { type: 'NotFoundError'; message: string }>> {
    const result = await this.getAccounts()
    if (!result.success)
      return {
        success: false,
        error: { type: 'NotFoundError', message: 'Account not found' },
      }

    const account = result.data.find((a) => a.id === id)
    if (!account)
      return {
        success: false,
        error: { type: 'NotFoundError', message: 'Account not found' },
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
    const err = validateAccount(account)
    if (err)
      return {
        success: false,
        error: { type: 'ValidationError', message: err },
      }

    try {
      const result = await this.getAccounts()
      const accounts = result.success ? [...result.data] : []
      const idx = accounts.findIndex((a) => a.id === account.id)
      if (idx >= 0) accounts[idx] = account
      else accounts.push(account)
      await this.writeFile('accounts.json', accounts)
      return { success: true, data: account }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error ? error.message : 'Failed to save account'
        ),
      }
    }
  }

  async deleteAccount(
    id: string
  ): Promise<
    Result<void, { type: 'NotFoundError' | 'StorageError'; message: string }>
  > {
    try {
      const result = await this.getAccounts()
      if (!result.success)
        return {
          success: false,
          error: {
            type: 'StorageError',
            message: 'Failed to retrieve accounts',
          },
        }

      const idx = result.data.findIndex((a) => a.id === id)
      if (idx === -1)
        return {
          success: false,
          error: { type: 'NotFoundError', message: 'Account not found' },
        }

      const updated = [...result.data]
      updated.splice(idx, 1)
      await this.writeFile('accounts.json', updated)
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error ? error.message : 'Failed to delete account'
        ),
      }
    }
  }

  // ── Transaction Operations ─────────────────────────────────────────────────
  // Partitioned by month: transactions_YYYY_MM.json

  async getTransactions(): Promise<
    Result<Transaction[], { type: 'StorageError'; message: string }>
  > {
    try {
      await this.warmCache()
      const txFiles = [...this.fileIdCache.keys()].filter((k) =>
        /^transactions_\d{4}_\d{2}\.json$/.test(k)
      )
      const all: Transaction[] = []
      for (const fileName of txFiles) {
        const data = await this.readFile<Transaction>(fileName)
        all.push(...data)
      }
      return { success: true, data: all }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error
            ? error.message
            : 'Failed to retrieve transactions'
        ),
      }
    }
  }

  async getTransaction(
    id: string
  ): Promise<Result<Transaction, { type: 'NotFoundError'; message: string }>> {
    const result = await this.getTransactions()
    if (!result.success)
      return {
        success: false,
        error: { type: 'NotFoundError', message: 'Transaction not found' },
      }

    const tx = result.data.find((t) => t.id === id)
    if (!tx)
      return {
        success: false,
        error: { type: 'NotFoundError', message: 'Transaction not found' },
      }

    return { success: true, data: tx }
  }

  async saveTransaction(
    transaction: Transaction
  ): Promise<
    Result<
      Transaction,
      { type: 'ValidationError' | 'StorageError'; message: string }
    >
  > {
    const err = validateTransaction(transaction)
    if (err)
      return {
        success: false,
        error: { type: 'ValidationError', message: err },
      }

    try {
      const fileName = txFileName(transaction.date)
      const existing = await this.readFile<Transaction>(fileName)
      const idx = existing.findIndex((t) => t.id === transaction.id)
      if (idx >= 0) existing[idx] = transaction
      else existing.push(transaction)
      await this.writeFile(fileName, existing)
      return { success: true, data: transaction }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error ? error.message : 'Failed to save transaction'
        ),
      }
    }
  }

  async deleteTransaction(
    id: string
  ): Promise<
    Result<void, { type: 'NotFoundError' | 'StorageError'; message: string }>
  > {
    try {
      await this.warmCache()
      const txFiles = [...this.fileIdCache.keys()].filter((k) =>
        /^transactions_\d{4}_\d{2}\.json$/.test(k)
      )
      for (const fileName of txFiles) {
        const data = await this.readFile<Transaction>(fileName)
        const idx = data.findIndex((t) => t.id === id)
        if (idx !== -1) {
          data.splice(idx, 1)
          await this.writeFile(fileName, data)
          return { success: true, data: undefined }
        }
      }
      return {
        success: false,
        error: { type: 'NotFoundError', message: 'Transaction not found' },
      }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error
            ? error.message
            : 'Failed to delete transaction'
        ),
      }
    }
  }

  // ── Recurring Transaction Operations ──────────────────────────────────────

  async getRecurringTransactions(): Promise<
    Result<RecurringTransaction[], { type: 'StorageError'; message: string }>
  > {
    try {
      const data = await this.readFile<RecurringTransaction>('recurring.json')
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error
            ? error.message
            : 'Failed to retrieve recurring transactions'
        ),
      }
    }
  }

  async getRecurringTransaction(
    id: string
  ): Promise<
    Result<RecurringTransaction, { type: 'NotFoundError'; message: string }>
  > {
    const result = await this.getRecurringTransactions()
    if (!result.success)
      return {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Recurring transaction not found',
        },
      }

    const rec = result.data.find((r) => r.id === id)
    if (!rec)
      return {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Recurring transaction not found',
        },
      }

    return { success: true, data: rec }
  }

  async saveRecurringTransaction(
    recurring: RecurringTransaction
  ): Promise<
    Result<
      RecurringTransaction,
      { type: 'ValidationError' | 'StorageError'; message: string }
    >
  > {
    const err = validateRecurringTransaction(recurring)
    if (err)
      return {
        success: false,
        error: { type: 'ValidationError', message: err },
      }

    try {
      const result = await this.getRecurringTransactions()
      const list = result.success ? [...result.data] : []
      const idx = list.findIndex((r) => r.id === recurring.id)
      if (idx >= 0) list[idx] = recurring
      else list.push(recurring)
      await this.writeFile('recurring.json', list)
      return { success: true, data: recurring }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error
            ? error.message
            : 'Failed to save recurring transaction'
        ),
      }
    }
  }

  async deleteRecurringTransaction(
    id: string
  ): Promise<
    Result<void, { type: 'NotFoundError' | 'StorageError'; message: string }>
  > {
    try {
      const result = await this.getRecurringTransactions()
      if (!result.success)
        return {
          success: false,
          error: {
            type: 'StorageError',
            message: 'Failed to retrieve recurring transactions',
          },
        }

      const idx = result.data.findIndex((r) => r.id === id)
      if (idx === -1)
        return {
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'Recurring transaction not found',
          },
        }

      const updated = [...result.data]
      updated.splice(idx, 1)
      await this.writeFile('recurring.json', updated)
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error
            ? error.message
            : 'Failed to delete recurring transaction'
        ),
      }
    }
  }

  // ── Investment Snapshot Operations ─────────────────────────────────────────

  async getInvestmentSnapshots(
    accountId?: string
  ): Promise<
    Result<InvestmentSnapshot[], { type: 'StorageError'; message: string }>
  > {
    try {
      let data = await this.readFile<InvestmentSnapshot>('investments.json')
      if (accountId) data = data.filter((s) => s.accountId === accountId)
      data.sort((a, b) => a.date.localeCompare(b.date))
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error
            ? error.message
            : 'Failed to retrieve investment snapshots'
        ),
      }
    }
  }

  async saveInvestmentSnapshot(
    snapshot: InvestmentSnapshot
  ): Promise<
    Result<InvestmentSnapshot, { type: 'StorageError'; message: string }>
  > {
    try {
      const existing =
        await this.readFile<InvestmentSnapshot>('investments.json')
      const idx = existing.findIndex(
        (s) => s.accountId === snapshot.accountId && s.date === snapshot.date
      )
      if (idx >= 0) existing[idx] = snapshot
      else existing.push(snapshot)
      await this.writeFile('investments.json', existing)
      return { success: true, data: snapshot }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error
            ? error.message
            : 'Failed to save investment snapshot'
        ),
      }
    }
  }

  // ── Net Worth Snapshot Operations ──────────────────────────────────────────
  // Partitioned by year: networth_YYYY.json

  async getNetWorthSnapshots(): Promise<
    Result<NetWorthSnapshot[], { type: 'StorageError'; message: string }>
  > {
    try {
      await this.warmCache()
      const nwFiles = [...this.fileIdCache.keys()].filter((k) =>
        /^networth_\d{4}\.json$/.test(k)
      )
      const all: NetWorthSnapshot[] = []
      for (const fileName of nwFiles) {
        const data = await this.readFile<NetWorthSnapshot>(fileName)
        all.push(...data)
      }
      return {
        success: true,
        data: all.sort((a, b) => b.date.localeCompare(a.date)),
      }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error
            ? error.message
            : 'Failed to retrieve snapshots'
        ),
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
    const err = validateNetWorthSnapshot(snapshot)
    if (err)
      return {
        success: false,
        error: { type: 'ValidationError', message: err },
      }

    try {
      const fileName = nwFileName(snapshot.date)
      const existing = await this.readFile<NetWorthSnapshot>(fileName)
      // One snapshot per date — replace same-date entry
      const normalized = existing.filter(
        (s) => s.date !== snapshot.date && s.id !== snapshot.id
      )
      normalized.push(snapshot)
      await this.writeFile(fileName, normalized)
      return { success: true, data: snapshot }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error ? error.message : 'Failed to save snapshot'
        ),
      }
    }
  }

  // ── Bulk Operations ────────────────────────────────────────────────────────

  async exportData(): Promise<
    Result<ExportData, { type: 'StorageError'; message: string }>
  > {
    try {
      const [
        accountsResult,
        transactionsResult,
        recurringResult,
        snapshotsResult,
      ] = await Promise.all([
        this.getAccounts(),
        this.getTransactions(),
        this.getRecurringTransactions(),
        this.getNetWorthSnapshots(),
      ])

      return {
        success: true,
        data: {
          version: VERSION,
          exportedAt: new Date().toISOString(),
          accounts: accountsResult.success ? accountsResult.data : [],
          transactions: transactionsResult.success
            ? transactionsResult.data
            : [],
          recurring: recurringResult.success ? recurringResult.data : [],
          netWorthSnapshots: snapshotsResult.success
            ? snapshotsResult.data
            : [],
        },
      }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error ? error.message : 'Failed to export data'
        ),
      }
    }
  }

  async importData(
    data: ExportData
  ): Promise<
    Result<void, { type: 'ValidationError' | 'StorageError'; message: string }>
  > {
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

    try {
      await this.clearAllData()

      // Write static files
      await this.writeFile('accounts.json', data.accounts)
      await this.writeFile('recurring.json', data.recurring)

      // Write transactions grouped by month
      const txByMonth = new Map<string, Transaction[]>()
      for (const tx of data.transactions) {
        const key = txFileName(tx.date)
        if (!txByMonth.has(key)) txByMonth.set(key, [])
        txByMonth.get(key)!.push(tx)
      }
      for (const [fileName, txs] of txByMonth) {
        await this.writeFile(fileName, txs)
      }

      // Write net worth snapshots grouped by year
      const nwByYear = new Map<string, NetWorthSnapshot[]>()
      for (const snap of data.netWorthSnapshots) {
        const key = nwFileName(snap.date)
        if (!nwByYear.has(key)) nwByYear.set(key, [])
        nwByYear.get(key)!.push(snap)
      }
      for (const [fileName, snaps] of nwByYear) {
        await this.writeFile(fileName, snaps)
      }

      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error ? error.message : 'Failed to import data'
        ),
      }
    }
  }

  async clearAllData(): Promise<
    Result<void, { type: 'StorageError'; message: string }>
  > {
    try {
      await this.warmCache()
      const allFiles = [...this.fileIdCache.keys()]
      for (const fileName of allFiles) {
        await this.deleteFile(fileName)
      }
      this.cacheWarmed = false
      this.contentCache.clear()
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: this.storageErr(
          error instanceof Error ? error.message : 'Failed to clear data'
        ),
      }
    }
  }
}

// ── Validators (module-level, shared) ────────────────────────────────────────

function validateAccount(account: Account): string | null {
  if (!isValidUUID(account.id)) return 'Invalid account ID'
  if (!account.name || account.name.length === 0 || account.name.length > 100)
    return 'Account name must be 1-100 characters'
  if (!isValidAccountType(account.type)) return 'Invalid account type'
  if (!isValidAmount(account.balance, { allowNegative: true }))
    return 'Invalid account balance'
  if (!isValidAccountStatus(account.status)) return 'Invalid account status'
  if (!isValidDateString(account.createdAt)) return 'Invalid createdAt date'
  if (!isValidDateString(account.updatedAt)) return 'Invalid updatedAt date'
  return null
}

function validateTransaction(transaction: Transaction): string | null {
  if (!isValidUUID(transaction.id)) return 'Invalid transaction ID'
  if (!isValidUUID(transaction.fromAccountId)) return 'Invalid fromAccountId'
  if (!isValidUUID(transaction.toAccountId)) return 'Invalid toAccountId'
  if (!isValidAmount(transaction.amount, { allowZero: false }))
    return 'Invalid transaction amount'
  if (!transaction.description || transaction.description.length === 0)
    return 'Transaction description is required'
  if (!isValidDateString(transaction.date)) return 'Invalid transaction date'
  if (!isValidDateString(transaction.createdAt)) return 'Invalid createdAt date'
  return null
}

function validateRecurringTransaction(
  recurring: RecurringTransaction
): string | null {
  if (!isValidUUID(recurring.id)) return 'Invalid recurring transaction ID'
  if (!isValidUUID(recurring.fromAccountId)) return 'Invalid fromAccountId'
  if (!isValidUUID(recurring.toAccountId)) return 'Invalid toAccountId'
  if (!isValidAmount(recurring.amount, { allowZero: false }))
    return 'Invalid amount'
  if (!recurring.description || recurring.description.length === 0)
    return 'Description is required'
  if (!isValidRecurrenceFrequency(recurring.frequency))
    return 'Invalid recurrence frequency'
  if (!isValidRecurringStatus(recurring.status))
    return 'Invalid recurring status'
  if (
    recurring.lastProcessedDate &&
    !isValidDateString(recurring.lastProcessedDate)
  )
    return 'Invalid lastProcessedDate'
  if (!isValidDateString(recurring.createdAt)) return 'Invalid createdAt date'
  if (!isValidDateString(recurring.updatedAt)) return 'Invalid updatedAt date'
  return null
}

function validateNetWorthSnapshot(snapshot: NetWorthSnapshot): string | null {
  if (!isValidUUID(snapshot.id)) return 'Invalid snapshot ID'
  if (!isValidDateString(snapshot.date)) return 'Invalid snapshot date'
  if (!isValidAmount(snapshot.totalAssets, { allowNegative: true }))
    return 'Invalid totalAssets'
  if (!isValidAmount(snapshot.totalLiabilities, { allowNegative: true }))
    return 'Invalid totalLiabilities'
  if (!isValidAmount(snapshot.netWorth, { allowNegative: true }))
    return 'Invalid netWorth'
  if (!isValidDateString(snapshot.createdAt)) return 'Invalid createdAt date'
  return null
}
