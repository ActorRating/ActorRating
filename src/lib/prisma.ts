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

// For serverless, configure connection pooler
// Supabase connection pooler: add ?pgbouncer=true for transaction mode
// Or use connection_limit=1 to limit connections per instance
let connectionUrl = databaseUrl

// If using Supabase and URL doesn't have pgbouncer, add it for transaction mode
if (databaseUrl.includes('supabase.co') && !databaseUrl.includes('pgbouncer')) {
  // Check if it's already the pooler port (6543) or direct port (5432)
  if (databaseUrl.includes(':5432/')) {
    // Replace with pooler port for transaction mode
    connectionUrl = databaseUrl.replace(':5432/', ':6543/') + (databaseUrl.includes('?') ? '&' : '?') + 'pgbouncer=true'
  } else if (!databaseUrl.includes('?')) {
    // Add connection limit for other providers
    connectionUrl = `${databaseUrl}?connection_limit=1&pool_timeout=20`
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  datasources: {
    db: {
      url: connectionUrl,
    },
  },
})

// In production (serverless), don't reuse the client across requests
// In development, reuse to avoid too many connections
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} 