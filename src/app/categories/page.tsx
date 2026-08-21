'use client'

import dynamic from 'next/dynamic'

const Categories = dynamic(() => import('@/views/Categories'), { ssr: false })

export default function CategoriesPage() {
  return <Categories />
}
