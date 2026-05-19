'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast'
import { BarChart3, LogOut, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react'
import { logout } from '@/lib/auth/client'

export function FinanceNav() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    const saved = localStorage.getItem('sidebarExpanded')
    if (saved !== null) {
      setIsExpanded(JSON.parse(saved))
    }
  }, [])

  const toggleSidebar = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    localStorage.setItem('sidebarExpanded', JSON.stringify(newState))
  }

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
    { href: '/finance/reports', label: 'Reports', icon: BarChart3 },
  ]

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg hover:bg-gray-100 transition-colors bg-white border border-gray-200"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={`${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } ${isExpanded ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col transition-all duration-300 fixed md:relative z-40 md:z-auto`}>
        <div className={`${isExpanded ? 'p-6' : 'p-4'} border-b border-gray-200`}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {isExpanded && (
                <>
                  <h1 className="text-xl font-semibold text-gray-900 truncate">WebStockName</h1>
                  <p className="text-sm text-gray-500 truncate">Finance</p>
                </>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2 p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isExpanded ? 'justify-start' : 'justify-center'} ${
                      active
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={!isExpanded ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {isExpanded && <span className="truncate">{item.label}</span>}
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
            className={`w-full flex items-center ${isExpanded ? 'justify-start' : 'justify-center'}`}
            title={!isExpanded ? 'Logout' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isExpanded && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </nav>
    </>
  )
}
