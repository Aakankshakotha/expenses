import type { Account } from '@/types/account'
import type { Transaction, TransactionCategory } from '@/types/transaction'
import type { ExportData } from './storageService'
import * as storageService from './storageService'
import { listAllCategories } from './categoryService'
import { formatDate } from '@/utils/dateUtils'

const LAST_BACKUP_KEY = 'moneyflow_last_backup_at'

export interface BackupSummary {
  exportedAt: string
  accounts: number
  transactions: number
  recurring: number
  budgets: number
  categories: number
}

/** ISO timestamp of the last successful backup download, if any */
export function getLastBackupAt(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY)
  } catch {
    return null
  }
}

function markBackedUp(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
  } catch {
    // Reminder only — the download itself already succeeded
  }
}

function downloadFile(contents: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Download every account, transaction, budget and category as one JSON file */
export async function downloadBackup(): Promise<void> {
  const result = await storageService.exportData()
  if (!result.success) throw new Error(result.error.message)

  downloadFile(
    JSON.stringify(result.data, null, 2),
    `moneyflow-backup-${formatDate(new Date())}.json`,
    'application/json'
  )
  markBackedUp()
}

function csvCell(value: string): string {
  // Leading = + - @ would run as a formula when the file is opened in Excel
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Amount in rupees with exactly two decimals, computed from integer paise */
function paiseToRupeeString(paise: number): string {
  const rupees = Math.floor(paise / 100)
  return `${rupees}.${String(paise % 100).padStart(2, '0')}`
}

export function buildTransactionsCsv(
  transactions: Transaction[],
  accounts: Account[],
  categories: TransactionCategory[]
): string {
  const accountById = new Map(accounts.map((a) => [a.id, a]))
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((txn) => {
      const from = accountById.get(txn.fromAccountId)
      const to = accountById.get(txn.toAccountId)
      const kind =
        from?.type === 'income'
          ? 'Received'
          : to?.type === 'expense'
            ? 'Spent'
            : 'Moved'
      return [
        txn.date,
        txn.description,
        kind,
        from?.name ?? '(deleted account)',
        to?.name ?? '(deleted account)',
        txn.category ? (categoryById.get(txn.category)?.name ?? '') : '',
        paiseToRupeeString(txn.amount),
        (txn.tags ?? []).join('; '),
      ]
    })

  const header = [
    'Date',
    'Description',
    'Type',
    'From',
    'To',
    'Category',
    'Amount (INR)',
    'Tags',
  ]
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

/** Download all transactions as a spreadsheet-friendly CSV */
export async function downloadTransactionsCsv(): Promise<void> {
  const result = await storageService.exportData()
  if (!result.success) throw new Error(result.error.message)
  const categories = await listAllCategories()

  const csv = buildTransactionsCsv(
    result.data.transactions,
    result.data.accounts,
    categories
  )
  // BOM so Excel reads ₹ and non-English descriptions as UTF-8
  downloadFile(
    '﻿' + csv,
    `moneyflow-transactions-${formatDate(new Date())}.csv`,
    'text/csv;charset=utf-8'
  )
}

/** Parse a backup file and summarise it so the user can confirm before restoring */
export async function readBackupFile(
  file: File
): Promise<{ data: ExportData; summary: BackupSummary }> {
  let data: ExportData
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('This file is not a MoneyFlow backup (invalid JSON).')
  }
  if (!Array.isArray(data?.accounts) || !Array.isArray(data?.transactions)) {
    throw new Error('This file is not a MoneyFlow backup.')
  }

  return {
    data,
    summary: {
      exportedAt: data.exportedAt,
      accounts: data.accounts.length,
      transactions: data.transactions.length,
      recurring: data.recurring?.length ?? 0,
      budgets: data.budgets?.length ?? 0,
      categories: data.categories?.length ?? 0,
    },
  }
}

/** Replace all current data with a backup. Current data is kept if this fails. */
export async function restoreBackup(data: ExportData): Promise<void> {
  const result = await storageService.importData(data)
  if (!result.success) throw new Error(result.error.message)
}
