'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getAccessToken, refreshToken } from '@/lib/auth/client'
import { decodeAccessToken } from '@/lib/auth/decode'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't check auth on login page
    if (pathname === '/login') {
      return
    }

    const checkAndRefreshToken = async () => {
      const token = getAccessToken()

      if (!token) {
        // No token, redirect to login if not already there
        if (pathname !== '/login') {
          router.push('/login')
        }
        return
      }

      try {
        // Decode to check expiry
        const decoded = decodeAccessToken(token)
        if (!decoded || !decoded.exp) {
          throw new Error('Invalid token')
        }

        const expiresAt = decoded.exp * 1000 // Convert to milliseconds
        const now = Date.now()
        const timeUntilExpiry = expiresAt - now

        // If token expires in less than 1 minute, refresh it
        if (timeUntilExpiry < 60 * 1000) {
          try {
            await refreshToken()
          } catch (error) {
            console.error('Token refresh failed:', error)
            router.push('/login')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      }
    }

    checkAndRefreshToken()
  }, [pathname, router])

  return <>{children}</>
}
