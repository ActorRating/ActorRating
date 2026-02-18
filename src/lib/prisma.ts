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

// For serverless (Vercel), use the pooler URL with pgbouncer=true so Prisma does NOT use
// prepared statements. Otherwise you get: "prepared statement already exists",
// "bind message supplies X parameters but prepared statement requires Y", "prepared statement does not exist".
// Supabase: use pooler (e.g. port 6543) with ?pgbouncer=true. Neon/Vercel Postgres: same.
let connectionUrl = databaseUrl

const hasParams = databaseUrl.includes('?')
const separator = hasParams ? '&' : '?'

if (!databaseUrl.includes('pgbouncer=')) {
  connectionUrl = `${databaseUrl}${separator}pgbouncer=true`
}

// Add connection limit and timeouts if not already present (helps with serverless).
if (!databaseUrl.includes('connection_limit')) {
  const sep = connectionUrl.includes('?') ? '&' : '?'
  connectionUrl += `${sep}connection_limit=3&pool_timeout=25&connect_timeout=10`
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