import React from 'react'
import { ToastProvider } from '@/components/toast'

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </ToastProvider>
  )
}
