'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/auth/client'
import { decodeAccessToken } from '@/lib/auth/decode'

export default function DashboardRouter() {
  const router = useRouter()

  useEffect(() => {
    const token = getAccessToken()

    if (!token) {
      router.push('/login')
      return
    }

    try {
      // Decode token to get role (no verification needed on client)
      const decoded = decodeAccessToken(token)

      if (!decoded || !decoded.role) {
        throw new Error('Invalid token')
      }

      // Redirect based on role
      const roleRoutes: Record<string, string> = {
        SUPERADMIN: '/admin',
        FINANCE: '/finance/reports',
        CASHIER: '/cashier/pos',
      }

      const redirectPath = roleRoutes[decoded.role]
      if (redirectPath) {
        router.push(redirectPath)
      } else {
        // Unknown role, redirect to login
        router.push('/login')
      }
    } catch (error) {
      console.error('Dashboard router error:', error)
      router.push('/login')
    }
  }, [router])

  return null
}
