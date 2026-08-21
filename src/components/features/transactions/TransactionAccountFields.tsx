'use client'

import React from 'react'
import { Select } from '@/components/common'
import type { Account } from '@/types/account'

interface TransactionAccountFieldsProps {
  primaryLabel: string
  primaryAccounts: Account[]
  primaryAccountId: string
  onPrimaryChange: (id: string) => void
  displayAccount: Account | undefined
  secondaryLabel: string
  secondaryAccounts: Account[]
  secondaryAccountId: string
  secondaryPlaceholder: string
  onSecondaryChange: (id: string) => void
}

export const TransactionAccountFields: React.FC<
  TransactionAccountFieldsProps
> = ({
  primaryLabel,
  primaryAccounts,
  primaryAccountId,
  onPrimaryChange,
  displayAccount,
  secondaryLabel,
  secondaryAccounts,
  secondaryAccountId,
  secondaryPlaceholder,
  onSecondaryChange,
}) => (
  <>
    <Select
      label={primaryLabel}
      value={primaryAccountId}
      onChange={(e) => onPrimaryChange(e.target.value)}
      options={primaryAccounts.map((acc) => ({
        value: acc.id,
        label: acc.name,
      }))}
      required
      placeholder="Select account"
    />

    <Select
      label={secondaryLabel}
      value={secondaryAccountId}
      onChange={(e) => onSecondaryChange(e.target.value)}
      options={secondaryAccounts.map((acc) => ({
        value: acc.id,
        label: acc.name,
      }))}
      required
      disabled={!primaryAccountId}
      placeholder={secondaryPlaceholder}
    />
  </>
)
