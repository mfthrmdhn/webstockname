'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function getRoleFromToken(token: string | null): string | null {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1])).role
  } catch {
    return null
  }
}

function redirectByRole(role: string | null, router: ReturnType<typeof useRouter>) {
  if (role === 'FINANCE') {
    router.push('/finance/reports')
  } else if (role === 'CASHIER') {
    router.push('/cashier/pos')
  } else {
    router.push('/admin/users')
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      const role = getRoleFromToken(token)
      redirectByRole(role, router)
    } else {
      setIsChecking(false)
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      // Decode role from JWT to route to correct dashboard
      const token = localStorage.getItem('accessToken')
      const role = getRoleFromToken(token)
      redirectByRole(role, router)
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  if (isChecking) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6">WebStockName</h1>
          <h2 className="text-lg sm:text-xl font-semibold text-center mb-6 sm:mb-8 text-gray-700">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <p className="text-center text-xs sm:text-sm text-gray-600 mt-6 sm:mt-8 px-2">
            Demo credentials: <br className="sm:hidden" />
            <span className="font-mono text-gray-800">superadmin / TestPass123!</span>
          </p>
        </div>
      </div>
    </div>
  )
}
