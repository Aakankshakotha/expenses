'use client'

import dynamic from 'next/dynamic'

const Accounts = dynamic(() => import('@/views/Accounts'), { ssr: false })

export default function AccountsPage() {
  return <Accounts />
}
