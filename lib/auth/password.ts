import bcrypt from 'bcryptjs'

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 10) // 10 rounds (default secure level)
}

export async function comparePassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash)
}
