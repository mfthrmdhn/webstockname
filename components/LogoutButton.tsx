'use client'

import { useRouter } from 'next/navigation'
import { logout } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if API call fails
      router.push('/login')
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className="w-full justify-start"
    >
      Logout
    </Button>
  )
}
