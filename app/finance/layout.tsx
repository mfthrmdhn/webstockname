import React from 'react'
import { FinanceNav } from '@/components/FinanceNav'
import { ToastProvider } from '@/components/toast'

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50">
        <FinanceNav />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
