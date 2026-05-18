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

// Refresh lock to prevent concurrent refresh attempts
let refreshPromise: Promise<string> | null = null

export async function fetchWithRefresh(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Execute initial fetch with current token
  let response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      Authorization: `Bearer ${getAccessToken()}`
    }
  })

  // If 401, attempt token refresh and retry
  if (response.status === 401) {
    try {
      // Use refresh lock to prevent N+1 refresh calls
      const newToken = await getRefreshLock()

      // Retry original request with new token
      response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`
        }
      })
    } catch (error) {
      // Refresh failed, clear token and redirect
      logout()
      throw new Error('Session expired. Please log in again.')
    }
  }

  return response
}

// Helper: Implements refresh lock to prevent race conditions
async function getRefreshLock(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = refreshToken().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}
