'use client'

import dynamic from 'next/dynamic'

const Transactions = dynamic(() => import('@/views/Transactions'), {
  ssr: false,
})

export default function TransactionsPage() {
  return <Transactions />
}
