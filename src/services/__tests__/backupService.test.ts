import { describe, it, expect } from 'vitest'
import { buildTransactionsCsv } from '../backupService'
import type { Account } from '@/types/account'
import type { Transaction, TransactionCategory } from '@/types/transaction'

const account = (id: string, name: string, type: Account['type']): Account => ({
  id,
  name,
  type,
  balance: 0,
  status: 'active',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
})

const accounts = [
  account('salary', 'Salary', 'income'),
  account('bank', 'HDFC Savings', 'asset'),
  account('food', 'Food', 'expense'),
  account('card', 'Credit Card', 'liability'),
]
const categories: TransactionCategory[] = [
  { id: 'dining', name: 'Dining Out', group: 'food', color: '#000' },
]

const txn = (overrides: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(),
  fromAccountId: 'bank',
  toAccountId: 'food',
  amount: 100,
  description: 'Test',
  date: '2026-11-01',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
})

const rows = (csv: string) => csv.split('\r\n').slice(1)

describe('buildTransactionsCsv', () => {
  it('writes exact rupee amounts from paise without float drift', () => {
    const csv = buildTransactionsCsv(
      [
        txn({ amount: 1 }),
        txn({ amount: 10 }),
        txn({ amount: 12345678 }),
        txn({ amount: 30 }), // 0.1 + 0.2 territory
      ],
      accounts,
      categories
    )
    expect(rows(csv).map((r) => r.split(',')[6])).toEqual([
      '0.01',
      '0.10',
      '123456.78',
      '0.30',
    ])
  })

  it('labels spending, income and transfers in plain words', () => {
    const csv = buildTransactionsCsv(
      [
        txn({
          date: '2026-11-01',
          fromAccountId: 'salary',
          toAccountId: 'bank',
        }),
        txn({ date: '2026-11-02', fromAccountId: 'card', toAccountId: 'food' }),
        txn({ date: '2026-11-03', fromAccountId: 'bank', toAccountId: 'card' }),
      ],
      accounts,
      categories
    )
    expect(rows(csv).map((r) => r.split(',')[2])).toEqual([
      'Received',
      'Spent',
      'Moved',
    ])
  })

  it('sorts by date and resolves category names', () => {
    const csv = buildTransactionsCsv(
      [
        txn({ date: '2026-11-05', description: 'Later' }),
        txn({ date: '2026-11-02', description: 'Dinner', category: 'dining' }),
      ],
      accounts,
      categories
    )
    expect(rows(csv)[0]).toBe(
      '2026-11-02,Dinner,Spent,HDFC Savings,Food,Dining Out,1.00,'
    )
  })

  it('quotes commas and quotes, and neutralises spreadsheet formulas', () => {
    const csv = buildTransactionsCsv(
      [
        txn({ date: '2026-11-01', description: 'Rice, dal "special"' }),
        txn({ date: '2026-11-02', description: '=HYPERLINK("http://x")' }),
      ],
      accounts,
      categories
    )
    const [first, second] = rows(csv)
    expect(first).toContain('"Rice, dal ""special"""')
    expect(second).toContain(`"'=HYPERLINK(""http://x"")"`)
  })
})
