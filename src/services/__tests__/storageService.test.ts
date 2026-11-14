import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageService } from '../storageService'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import type { RecurringTransaction } from '@/types/recurring'
import type { NetWorthSnapshot } from '@/types/netWorth'

describe('StorageService', () => {
  let storageService: StorageService
  const mockLocalStorage: Record<string, string> = {}

  beforeEach(() => {
    // Clear mock localStorage before each test
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key])

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key]
      }),
      clear: vi.fn(() => {
        Object.keys(mockLocalStorage).forEach(
          (key) => delete mockLocalStorage[key]
        )
      }),
      get length() {
        return Object.keys(mockLocalStorage).length
      },
      key: vi.fn(
        (index: number) => Object.keys(mockLocalStorage)[index] ?? null
      ),
    } as Storage

    storageService = new StorageService()
  })

  describe('Account Operations', () => {
    const mockAccount: Account = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Account',
      type: 'asset',
      balance: 100000,
      status: 'active',
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z',
    }

    describe('saveAccount', () => {
      it('saves a new account successfully', async () => {
        const result = await storageService.saveAccount(mockAccount)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(mockAccount)
        }
      })

      it('updates an existing account', async () => {
        await storageService.saveAccount(mockAccount)

        const updatedAccount: Account = {
          ...mockAccount,
          name: 'Updated Account',
          balance: 200000,
          updatedAt: '2026-02-17T11:00:00.000Z',
        }

        const result = await storageService.saveAccount(updatedAccount)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.name).toBe('Updated Account')
          expect(result.data.balance).toBe(200000)
        }
      })

      it('validates account data before saving', async () => {
        const invalidAccount = {
          ...mockAccount,
          id: 'invalid-uuid',
        }

        const result = await storageService.saveAccount(
          invalidAccount as Account
        )

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.type).toBe('ValidationError')
        }
      })
    })

    describe('getAccount', () => {
      it('retrieves an account by id', async () => {
        await storageService.saveAccount(mockAccount)

        const result = await storageService.getAccount(mockAccount.id)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(mockAccount)
        }
      })

      it('returns NotFoundError for non-existent id', async () => {
        const result = await storageService.getAccount('non-existent-id')

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.type).toBe('NotFoundError')
        }
      })
    })

    describe('getAccounts', () => {
      it('retrieves all accounts', async () => {
        const account1 = mockAccount
        const account2: Account = {
          ...mockAccount,
          id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          name: 'Second Account',
        }

        await storageService.saveAccount(account1)
        await storageService.saveAccount(account2)

        const result = await storageService.getAccounts()

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toHaveLength(2)
          expect(result.data).toContainEqual(account1)
          expect(result.data).toContainEqual(account2)
        }
      })

      it('returns empty array when no accounts exist', async () => {
        const result = await storageService.getAccounts()

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual([])
        }
      })

      it('handles corrupted data gracefully', async () => {
        mockLocalStorage['moneyflow_accounts'] = 'invalid-json'

        const result = await storageService.getAccounts()

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.type).toBe('StorageError')
        }
      })
    })

    describe('deleteAccount', () => {
      it('deletes an account successfully', async () => {
        await storageService.saveAccount(mockAccount)

        const result = await storageService.deleteAccount(mockAccount.id)

        expect(result.success).toBe(true)

        const getResult = await storageService.getAccount(mockAccount.id)
        expect(getResult.success).toBe(false)
      })

      it('returns NotFoundError when deleting non-existent account', async () => {
        const result = await storageService.deleteAccount('non-existent-id')

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.type).toBe('NotFoundError')
        }
      })
    })
  })

  describe('Transaction Operations', () => {
    const mockTransaction: Transaction = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      fromAccountId: '550e8400-e29b-41d4-a716-446655440000',
      toAccountId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      amount: 5000,
      description: 'Test Transaction',
      date: '2026-02-17',
      createdAt: '2026-02-17T10:00:00.000Z',
    }

    describe('saveTransaction', () => {
      it('saves a new transaction successfully', async () => {
        const result = await storageService.saveTransaction(mockTransaction)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(mockTransaction)
        }
      })

      it('validates transaction data before saving', async () => {
        const invalidTransaction = {
          ...mockTransaction,
          amount: -100,
        }

        const result = await storageService.saveTransaction(
          invalidTransaction as Transaction
        )

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.type).toBe('ValidationError')
        }
      })
    })

    describe('getTransaction', () => {
      it('retrieves a transaction by id', async () => {
        await storageService.saveTransaction(mockTransaction)

        const result = await storageService.getTransaction(mockTransaction.id)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(mockTransaction)
        }
      })

      it('returns NotFoundError for non-existent id', async () => {
        const result = await storageService.getTransaction('non-existent-id')

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.type).toBe('NotFoundError')
        }
      })
    })

    describe('getTransactions', () => {
      it('retrieves all transactions', async () => {
        const transaction1 = mockTransaction
        const transaction2: Transaction = {
          ...mockTransaction,
          id: '6ba7b810-9dad-11d1-80b4-00c04fd430c9',
        }

        await storageService.saveTransaction(transaction1)
        await storageService.saveTransaction(transaction2)

        const result = await storageService.getTransactions()

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toHaveLength(2)
        }
      })

      it('returns empty array when no transactions exist', async () => {
        const result = await storageService.getTransactions()

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual([])
        }
      })
    })

    describe('deleteTransaction', () => {
      it('deletes a transaction successfully', async () => {
        await storageService.saveTransaction(mockTransaction)

        const result = await storageService.deleteTransaction(
          mockTransaction.id
        )

        expect(result.success).toBe(true)

        const getResult = await storageService.getTransaction(
          mockTransaction.id
        )
        expect(getResult.success).toBe(false)
      })
    })
  })

  describe('Recurring Transaction Operations', () => {
    const mockRecurring: RecurringTransaction = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      fromAccountId: '550e8400-e29b-41d4-a716-446655440000',
      toAccountId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      amount: 100000,
      description: 'Monthly Rent',
      frequency: 'monthly',
      status: 'active',
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z',
    }

    describe('saveRecurringTransaction', () => {
      it('saves a new recurring transaction successfully', async () => {
        const result =
          await storageService.saveRecurringTransaction(mockRecurring)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(mockRecurring)
        }
      })

      it('validates recurring transaction data before saving', async () => {
        const invalidRecurring = {
          ...mockRecurring,
          frequency: 'invalid-frequency',
        }

        const result = await storageService.saveRecurringTransaction(
          invalidRecurring as RecurringTransaction
        )

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.type).toBe('ValidationError')
        }
      })
    })

    describe('getRecurringTransaction', () => {
      it('retrieves a recurring transaction by id', async () => {
        await storageService.saveRecurringTransaction(mockRecurring)

        const result = await storageService.getRecurringTransaction(
          mockRecurring.id
        )

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(mockRecurring)
        }
      })
    })

    describe('getRecurringTransactions', () => {
      it('retrieves all recurring transactions', async () => {
        await storageService.saveRecurringTransaction(mockRecurring)

        const result = await storageService.getRecurringTransactions()

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toHaveLength(1)
          expect(result.data[0]).toEqual(mockRecurring)
        }
      })
    })

    describe('deleteRecurringTransaction', () => {
      it('deletes a recurring transaction successfully', async () => {
        await storageService.saveRecurringTransaction(mockRecurring)

        const result = await storageService.deleteRecurringTransaction(
          mockRecurring.id
        )

        expect(result.success).toBe(true)
      })
    })
  })

  describe('Net Worth Snapshot Operations', () => {
    const mockSnapshot: NetWorthSnapshot = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      date: '2026-02-17',
      totalAssets: 500000,
      totalLiabilities: 100000,
      netWorth: 400000,
      createdAt: '2026-02-17T10:00:00.000Z',
    }

    describe('saveNetWorthSnapshot', () => {
      it('saves a new snapshot successfully', async () => {
        const result = await storageService.saveNetWorthSnapshot(mockSnapshot)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(mockSnapshot)
        }
      })

      it('validates snapshot data before saving', async () => {
        const invalidSnapshot = {
          ...mockSnapshot,
          date: 'invalid-date',
        }

        const result = await storageService.saveNetWorthSnapshot(
          invalidSnapshot as NetWorthSnapshot
        )

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.type).toBe('ValidationError')
        }
      })
    })

    describe('getNetWorthSnapshots', () => {
      it('retrieves all snapshots', async () => {
        await storageService.saveNetWorthSnapshot(mockSnapshot)

        const result = await storageService.getNetWorthSnapshots()

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toHaveLength(1)
          expect(result.data[0]).toEqual(mockSnapshot)
        }
      })

      it('returns snapshots sorted by date descending', async () => {
        const snapshot1 = {
          ...mockSnapshot,
          id: '550e8400-e29b-41d4-a716-446655440004',
          date: '2026-02-01',
        }
        const snapshot2 = {
          ...mockSnapshot,
          id: '550e8400-e29b-41d4-a716-446655440005',
          date: '2026-02-15',
        }
        const snapshot3 = {
          ...mockSnapshot,
          id: '550e8400-e29b-41d4-a716-446655440006',
          date: '2026-02-10',
        }

        await storageService.saveNetWorthSnapshot(snapshot1)
        await storageService.saveNetWorthSnapshot(snapshot2)
        await storageService.saveNetWorthSnapshot(snapshot3)

        const result = await storageService.getNetWorthSnapshots()

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toHaveLength(3)
          expect(result.data[0].date).toBe('2026-02-15')
          expect(result.data[1].date).toBe('2026-02-10')
          expect(result.data[2].date).toBe('2026-02-01')
        }
      })
    })
  })

  describe('Budget and Category Operations', () => {
    it('persists and deletes budgets and custom categories', async () => {
      const budget = {
        id: 'budget-1',
        category: 'food',
        amount: 25000,
        period: 'monthly' as const,
        startDate: '2026-02-01',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      }
      const category = {
        id: 'custom-food',
        name: 'Coffee',
        group: 'food' as const,
        color: '#663399',
        isCustom: true,
      }

      expect((await storageService.saveBudget(budget)).success).toBe(true)
      expect((await storageService.saveCategory(category)).success).toBe(true)
      expect(await storageService.getBudgets()).toMatchObject({
        success: true,
        data: [budget],
      })
      expect(await storageService.getCategories()).toMatchObject({
        success: true,
        data: [category],
      })

      await storageService.deleteBudget(budget.id)
      await storageService.deleteCategory(category.id)

      expect(await storageService.getBudgets()).toMatchObject({
        success: true,
        data: [],
      })
      expect(await storageService.getCategories()).toMatchObject({
        success: true,
        data: [],
      })
    })
  })

  describe('Bulk Operations', () => {
    describe('exportData', () => {
      it('exports all data successfully', async () => {
        const account: Account = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Account',
          type: 'asset',
          balance: 100000,
          status: 'active',
          createdAt: '2026-02-17T10:00:00.000Z',
          updatedAt: '2026-02-17T10:00:00.000Z',
        }

        await storageService.saveAccount(account)

        const result = await storageService.exportData()

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.version).toBe('1.0.0')
          expect(result.data.accounts).toHaveLength(1)
          expect(result.data.accounts[0]).toEqual(account)
          expect(result.data.transactions).toEqual([])
          expect(result.data.recurring).toEqual([])
          expect(result.data.netWorthSnapshots).toEqual([])
        }
      })

      it('includes export timestamp', async () => {
        const result = await storageService.exportData()

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.exportedAt).toBeDefined()
          expect(new Date(result.data.exportedAt).getTime()).toBeGreaterThan(0)
        }
      })
    })

    describe('importData', () => {
      it('imports valid data successfully', async () => {
        const exportData = {
          version: '1.0.0',
          exportedAt: '2026-02-17T10:00:00.000Z',
          accounts: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Imported Account',
              type: 'asset' as const,
              balance: 100000,
              status: 'active' as const,
              createdAt: '2026-02-17T10:00:00.000Z',
              updatedAt: '2026-02-17T10:00:00.000Z',
            },
          ],
          transactions: [],
          recurring: [],
          netWorthSnapshots: [],
        }

        const result = await storageService.importData(exportData)

        expect(result.success).toBe(true)

        const accountsResult = await storageService.getAccounts()
        expect(accountsResult.success).toBe(true)
        if (accountsResult.success) {
          expect(accountsResult.data).toHaveLength(1)
          expect(accountsResult.data[0].name).toBe('Imported Account')
        }
      })

      it('validates imported data', async () => {
        const invalidData = {
          version: '1.0.0',
          exportedAt: '2026-02-17T10:00:00.000Z',
          accounts: [
            {
              id: 'invalid-uuid',
              name: 'Invalid Account',
              type: 'invalid-type',
            },
          ],
          transactions: [],
          recurring: [],
          netWorthSnapshots: [],
        }

        const result = await storageService.importData(
          invalidData as unknown as Parameters<
            typeof storageService.importData
          >[0]
        )

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.type).toBe('ValidationError')
        }
      })

      it('clears existing data before importing', async () => {
        const existingAccount: Account = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Existing Account',
          type: 'asset',
          balance: 50000,
          status: 'active',
          createdAt: '2026-02-17T09:00:00.000Z',
          updatedAt: '2026-02-17T09:00:00.000Z',
        }

        await storageService.saveAccount(existingAccount)

        const exportData = {
          version: '1.0.0',
          exportedAt: '2026-02-17T10:00:00.000Z',
          accounts: [
            {
              id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
              name: 'New Account',
              type: 'asset' as const,
              balance: 100000,
              status: 'active' as const,
              createdAt: '2026-02-17T10:00:00.000Z',
              updatedAt: '2026-02-17T10:00:00.000Z',
            },
          ],
          transactions: [],
          recurring: [],
          netWorthSnapshots: [],
        }

        await storageService.importData(exportData)

        const accountsResult = await storageService.getAccounts()
        expect(accountsResult.success).toBe(true)
        if (accountsResult.success) {
          expect(accountsResult.data).toHaveLength(1)
          expect(accountsResult.data[0].name).toBe('New Account')
        }
      })
    })

    describe('backup round trip', () => {
      const account = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bank',
        type: 'asset' as const,
        balance: 100000,
        status: 'active' as const,
        createdAt: '2026-02-17T10:00:00.000Z',
        updatedAt: '2026-02-17T10:00:00.000Z',
      }
      const budget = {
        id: 'budget-1',
        category: 'food',
        amount: 500000,
        period: 'monthly' as const,
        startDate: '2026-11-01',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      }
      const category = {
        id: 'custom-pets',
        name: 'Pets',
        group: 'personal' as const,
        color: '#888888',
        isCustom: true,
      }

      it('exports and restores budgets and custom categories', async () => {
        await storageService.saveAccount(account)
        await storageService.saveBudget(budget)
        await storageService.saveCategory(category)

        const exported = await storageService.exportData()
        expect(exported.success).toBe(true)
        if (!exported.success) return

        await storageService.clearAllData()
        const result = await storageService.importData(exported.data)
        expect(result.success).toBe(true)

        const budgets = await storageService.getBudgets()
        const categories = await storageService.getCategories()
        expect(budgets.success && budgets.data).toEqual([budget])
        expect(categories.success && categories.data).toEqual([category])
      })

      it('still imports older backups that have no budgets or categories', async () => {
        const result = await storageService.importData({
          version: '1.0.0',
          exportedAt: '2026-02-17T10:00:00.000Z',
          accounts: [account],
          transactions: [],
          recurring: [],
          netWorthSnapshots: [],
        })
        expect(result.success).toBe(true)
      })

      it('keeps existing data when writing the import fails partway', async () => {
        await storageService.saveAccount({ ...account, name: 'Existing' })
        const before = { ...mockLocalStorage }

        // Accounts get written, then the disk is full on the next write
        let failed = false
        vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
          if (key === 'moneyflow_recurring' && !failed) {
            failed = true
            throw new Error('QuotaExceededError')
          }
          mockLocalStorage[key] = value
        })

        const result = await storageService.importData({
          version: '1.0.0',
          exportedAt: '2026-02-17T10:00:00.000Z',
          accounts: [{ ...account, name: 'From backup' }],
          transactions: [],
          recurring: [],
          netWorthSnapshots: [],
        })

        expect(result.success).toBe(false)
        vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
          mockLocalStorage[key] = value
        })
        expect(mockLocalStorage).toEqual(before)
      })

      it('rejects a backup with a budget amount that is not whole paise', async () => {
        const result = await storageService.importData({
          version: '1.0.0',
          exportedAt: '2026-02-17T10:00:00.000Z',
          accounts: [],
          transactions: [],
          recurring: [],
          netWorthSnapshots: [],
          budgets: [{ ...budget, amount: 5000.5 }],
        })
        expect(result.success).toBe(false)
      })
    })

    describe('clearAllData', () => {
      it('clears all stored data', async () => {
        const account: Account = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Account',
          type: 'asset',
          balance: 100000,
          status: 'active',
          createdAt: '2026-02-17T10:00:00.000Z',
          updatedAt: '2026-02-17T10:00:00.000Z',
        }

        await storageService.saveAccount(account)

        const result = await storageService.clearAllData()

        expect(result.success).toBe(true)

        const accountsResult = await storageService.getAccounts()
        expect(accountsResult.success).toBe(true)
        if (accountsResult.success) {
          expect(accountsResult.data).toEqual([])
        }
      })
    })
  })

  describe('Derived balances', () => {
    const now = '2026-11-01T00:00:00.000Z'
    const makeAccount = (
      type: Account['type'],
      balance: number,
      name: string
    ): Account => ({
      id: crypto.randomUUID(),
      name,
      type,
      balance,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    const makeTxn = (
      from: Account,
      to: Account,
      amount: number,
      date = '2026-11-05'
    ): Transaction => ({
      id: crypto.randomUUID(),
      fromAccountId: from.id,
      toAccountId: to.id,
      amount,
      description: 'Test',
      date,
      createdAt: now,
    })
    const balanceOf = async (id: string) => {
      const result = await storageService.getAccount(id)
      if (!result.success) throw new Error('account missing')
      return result.data.balance
    }

    it('card purchase raises the amount owed; paying the bill lowers it', async () => {
      const bank = makeAccount('asset', 1000000, 'Bank')
      const card = makeAccount('liability', 500000, 'Card') // owes ₹5,000
      const food = makeAccount('expense', 0, 'Food')
      for (const a of [bank, card, food]) await storageService.saveAccount(a)

      await storageService.saveTransaction(makeTxn(card, food, 100000))
      expect(await balanceOf(card.id)).toBe(600000)
      expect(await balanceOf(food.id)).toBe(100000)

      await storageService.saveTransaction(makeTxn(bank, card, 600000))
      expect(await balanceOf(card.id)).toBe(0)
      expect(await balanceOf(bank.id)).toBe(400000)
    })

    it('deleting a transaction restores both balances exactly', async () => {
      const bank = makeAccount('asset', 1000000, 'Bank')
      const food = makeAccount('expense', 0, 'Food')
      await storageService.saveAccount(bank)
      await storageService.saveAccount(food)
      const txn = makeTxn(bank, food, 12345)

      await storageService.saveTransaction(txn)
      await storageService.deleteTransaction(txn.id)

      expect(await balanceOf(bank.id)).toBe(1000000)
      expect(await balanceOf(food.id)).toBe(0)
    })

    it('setting a balance by hand sticks, with transactions already present', async () => {
      const bank = makeAccount('asset', 1000000, 'Bank')
      const food = makeAccount('expense', 0, 'Food')
      await storageService.saveAccount(bank)
      await storageService.saveAccount(food)
      await storageService.saveTransaction(makeTxn(bank, food, 250000))

      await storageService.saveAccount({ ...bank, balance: 777700 })

      expect(await balanceOf(bank.id)).toBe(777700)
      expect(await balanceOf(food.id)).toBe(250000)
    })

    it('moving a transaction to another month does not count it twice', async () => {
      const bank = makeAccount('asset', 1000000, 'Bank')
      const food = makeAccount('expense', 0, 'Food')
      await storageService.saveAccount(bank)
      await storageService.saveAccount(food)
      const txn = makeTxn(bank, food, 100000, '2026-10-31')
      await storageService.saveTransaction(txn)

      await storageService.saveTransaction({ ...txn, date: '2026-11-01' })

      const all = await storageService.getTransactions()
      expect(all.success && all.data.map((t) => t.date)).toEqual(['2026-11-01'])
      expect(await balanceOf(bank.id)).toBe(900000)
    })

    it('converts running-balance records without changing any balance', async () => {
      const bank = makeAccount('asset', 900000, 'Bank') // already net of the txn
      const food = makeAccount('expense', 100000, 'Food')
      // Pre-migration layout: accounts hold a running balance
      mockLocalStorage['moneyflow_accounts'] = JSON.stringify({
        version: '1.0.0',
        data: [bank, food],
      })
      mockLocalStorage['moneyflow_transactions_2026_11'] = JSON.stringify({
        version: '1.0.0',
        data: [makeTxn(bank, food, 100000)],
      })

      expect(await balanceOf(bank.id)).toBe(900000)
      expect(await balanceOf(food.id)).toBe(100000)

      const stored = JSON.parse(mockLocalStorage['moneyflow_accounts']).data
      expect(stored[0]).toMatchObject({ id: bank.id, openingBalance: 1000000 })
      expect(stored[0]).not.toHaveProperty('balance')
    })

    it('converts before the first write, so a new transaction counts once', async () => {
      const bank = makeAccount('asset', 900000, 'Bank')
      const food = makeAccount('expense', 100000, 'Food')
      mockLocalStorage['moneyflow_accounts'] = JSON.stringify({
        version: '1.0.0',
        data: [bank, food],
      })
      mockLocalStorage['moneyflow_transactions_2026_11'] = JSON.stringify({
        version: '1.0.0',
        data: [makeTxn(bank, food, 100000)],
      })

      await storageService.saveTransaction(makeTxn(bank, food, 50000))

      expect(await balanceOf(bank.id)).toBe(850000)
      expect(await balanceOf(food.id)).toBe(150000)
    })

    it('restoring a backup reproduces its balances', async () => {
      const bank = makeAccount('asset', 900000, 'Bank')
      const food = makeAccount('expense', 100000, 'Food')
      const result = await storageService.importData({
        version: '1.0.0',
        exportedAt: now,
        accounts: [bank, food],
        transactions: [makeTxn(bank, food, 100000)],
        recurring: [],
        netWorthSnapshots: [],
      })
      expect(result.success).toBe(true)

      expect(await balanceOf(bank.id)).toBe(900000)
      expect(await balanceOf(food.id)).toBe(100000)

      const exported = await storageService.exportData()
      expect(
        exported.success && exported.data.accounts.map((a) => a.balance)
      ).toEqual([900000, 100000])
    })
  })

  describe('Error Handling', () => {
    it('handles localStorage quota exceeded', async () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem')
      setItemSpy.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const account: Account = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Account',
        type: 'asset',
        balance: 100000,
        status: 'active',
        createdAt: '2026-02-17T10:00:00.000Z',
        updatedAt: '2026-02-17T10:00:00.000Z',
      }

      const result = await storageService.saveAccount(account)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('StorageError')
        expect(result.error.message.toLowerCase()).toContain('storage')
      }

      setItemSpy.mockRestore()
    })

    it('handles localStorage unavailable', async () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem')
      getItemSpy.mockImplementation(() => {
        throw new Error('localStorage is not available')
      })

      const result = await storageService.getAccounts()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('StorageError')
      }

      getItemSpy.mockRestore()
    })
  })
})
