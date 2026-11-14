import { describe, it, expect } from 'vitest'
import { transactionEffect, netEffectsByAccount } from '../balanceUtils'

describe('transactionEffect', () => {
  it('moves money out of and into ordinary accounts', () => {
    expect(transactionEffect('from', 'asset', 500)).toBe(-500)
    expect(transactionEffect('to', 'asset', 500)).toBe(500)
    expect(transactionEffect('to', 'expense', 500)).toBe(500)
    expect(transactionEffect('from', 'income', 500)).toBe(-500)
  })

  it('treats liabilities as amount owed', () => {
    expect(transactionEffect('from', 'liability', 500)).toBe(500)
    expect(transactionEffect('to', 'liability', 500)).toBe(-500)
  })
})

describe('netEffectsByAccount', () => {
  it('sums both sides and ignores unknown accounts', () => {
    const effects = netEffectsByAccount(
      [
        {
          id: 't1',
          fromAccountId: 'bank',
          toAccountId: 'food',
          amount: 300,
          description: '',
          date: '2026-11-01',
          createdAt: '',
        },
        {
          id: 't2',
          fromAccountId: 'gone',
          toAccountId: 'bank',
          amount: 100,
          description: '',
          date: '2026-11-02',
          createdAt: '',
        },
      ],
      [
        { id: 'bank', type: 'asset' },
        { id: 'food', type: 'expense' },
      ]
    )
    expect(effects.get('bank')).toBe(-200)
    expect(effects.get('food')).toBe(300)
    expect(effects.has('gone')).toBe(false)
  })
})
