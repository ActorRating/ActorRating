import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Validate DATABASE_URL is set and properly formatted
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Please set it in your Vercel project settings or .env file.'
  )
}

if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  throw new Error(
    `DATABASE_URL must start with 'postgresql://' or 'postgres://'. ` +
    `Current value: ${databaseUrl.substring(0, 20)}...`
  )
}

// For serverless, add connection limits to prevent pool exhaustion.
// Supabase: use the pooler in TRANSACTION mode (port 6543), not session mode (5432),
// or you'll hit "MaxClientsInSessionMode: max clients reached". Same host, change port to 6543.
let connectionUrl = databaseUrl

// Add connection limit and timeouts if not already present (helps with serverless)
if (!databaseUrl.includes('connection_limit') && !databaseUrl.includes('pgbouncer')) {
  const separator = databaseUrl.includes('?') ? '&' : '?'
  connectionUrl = `${databaseUrl}${separator}connection_limit=1&pool_timeout=20&connect_timeout=10`
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  datasources: {
    db: {
      url: connectionUrl,
    },
  },
})

// Reuse Prisma client across requests to prevent connection pool exhaustion
// This is especially important in serverless environments like Vercel
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
} 