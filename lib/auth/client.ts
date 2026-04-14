'use client'

export async function login(username: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include' // Include cookies
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Login failed')
  }

  const { accessToken, user } = await response.json()
  localStorage.setItem('accessToken', accessToken)
  return user
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

export async function logout() {
  const token = getAccessToken()

  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    credentials: 'include'
  }).catch(() => {
    // Continue with logout even if API call fails
  })

  localStorage.removeItem('accessToken')
}

export async function refreshToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Token refresh failed')
  }

  const { accessToken } = await response.json()
  localStorage.setItem('accessToken', accessToken)
  return accessToken
}
