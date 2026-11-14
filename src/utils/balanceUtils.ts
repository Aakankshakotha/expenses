/**
 * Balance rules — the single place that decides how a transaction moves a balance.
 * Account balances are never stored; they are opening balance + these effects.
 */

import type { Account, AccountType } from '@/types/account'
import type { Transaction } from '@/types/transaction'

/**
 * Signed change a transaction makes to one side's balance, in paise.
 * Liabilities hold the amount owed as a positive number, so drawing from one
 * (a card purchase) increases it and paying into one reduces it.
 */
export function transactionEffect(
  side: 'from' | 'to',
  accountType: AccountType,
  amount: number
): number {
  const effect = side === 'from' ? -amount : amount
  return accountType === 'liability' ? -effect : effect
}

/** Net effect of all transactions on each account, keyed by account ID */
export function netEffectsByAccount(
  transactions: Transaction[],
  accounts: Pick<Account, 'id' | 'type'>[]
): Map<string, number> {
  const typeById = new Map(accounts.map((a) => [a.id, a.type]))
  const effects = new Map<string, number>()

  const add = (side: 'from' | 'to', accountId: string, amount: number) => {
    const type = typeById.get(accountId)
    if (!type) return
    effects.set(
      accountId,
      (effects.get(accountId) ?? 0) + transactionEffect(side, type, amount)
    )
  }

  for (const txn of transactions) {
    add('from', txn.fromAccountId, txn.amount)
    add('to', txn.toAccountId, txn.amount)
  }
  return effects
}
