// Client-side JWT decoding (no verification needed)
// Only use on client to extract claims - verification happens on server

export interface TokenPayload {
  userId: string
  role: string
  exp?: number
  iat?: number
}

export function decodeAccessToken(token: string): TokenPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode the payload (second part)
    const payload = parts[1]
    const decoded = JSON.parse(atob(payload)) as TokenPayload

    return decoded
  } catch (error) {
    console.error('Failed to decode token:', error)
    return null
  }
}
