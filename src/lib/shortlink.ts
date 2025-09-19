import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function generateCode(length = 6): string {
  let out = ''
  const bytes = randomBytes(length)
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

export async function createUniqueShortCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode(6)
    const exists = await prisma.shortLink.findUnique({ where: { code } })
    if (!exists) return code
  }
  for (let i = 0; i < 10; i++) {
    const code = generateCode(8)
    const exists = await prisma.shortLink.findUnique({ where: { code } })
    if (!exists) return code
  }
  throw new Error('Failed to generate unique short code')
}

