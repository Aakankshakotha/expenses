'use client'

import dynamic from 'next/dynamic'

const Recurring = dynamic(() => import('@/views/Recurring'), { ssr: false })

export default function RecurringPage() {
  return <Recurring />
}
