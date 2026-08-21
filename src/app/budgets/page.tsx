'use client'

import dynamic from 'next/dynamic'

const Budgets = dynamic(() => import('@/views/Budgets'), { ssr: false })

export default function BudgetsPage() {
  return <Budgets />
}
