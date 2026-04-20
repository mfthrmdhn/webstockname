'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast'
import { Users, Package, FileText, LogOut, BarChart3 } from 'lucide-react'
import { logout } from '@/lib/auth/client'

export function AdminNav() {
  const pathname = usePathname()
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const navItems = [
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/inventory', label: 'Inventory', icon: BarChart3 },
    { href: '/admin/audit', label: 'Audit Log', icon: FileText },
  ]

  return (
    <nav className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">WebStockName</h1>
        <p className="text-sm text-gray-500">Admin Dashboard</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              </Link>
            )
          })}
        </div>
      </div>

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
