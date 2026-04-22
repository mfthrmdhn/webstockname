'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast'
import { LogOut } from 'lucide-react'
import { logout } from '@/lib/auth/client'

export function CashierNav() {
  const router = useRouter()
  const { addToast } = useToast()

  const handleLogout = async () => {
    try {
      await logout()
      addToast('Logged out successfully', 'success')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      addToast('Logout error', 'error')
    }
  }

  return (
    <nav className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">WebStockName</h1>
        <p className="text-sm text-gray-500">Cashier</p>
      </div>

      <div className="flex-1 overflow-y-auto" />

      <div className="border-t border-gray-200 p-4">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </nav>
  )
}
