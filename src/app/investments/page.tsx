'use client'

import dynamic from 'next/dynamic'

const Investments = dynamic(() => import('@/views/Investments'), { ssr: false })

export default function InvestmentsPage() {
  return <Investments />
}
