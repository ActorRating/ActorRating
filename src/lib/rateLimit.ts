import { prisma } from "@/lib/prisma"

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  rating: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 ratings per minute (increased for testing)
  byLookup: { windowMs: 60 * 1000, maxRequests: 120 },
  og: { windowMs: 60 * 1000, maxRequests: 60 },
  profileUpdate: { windowMs: 60 * 1000, maxRequests: 10 },
  onboardingComplete: { windowMs: 60 * 1000, maxRequests: 12 },
  usernameCheck: { windowMs: 60 * 1000, maxRequests: 45 },
  profileUpdateCooldown: { windowMs: 15 * 1000, maxRequests: 1 },
  usernameCheckCooldown: { windowMs: 2 * 1000, maxRequests: 1 },
}

function getWindowBucket(windowMs: number): Date {
  return new Date(Math.floor(Date.now() / windowMs) * windowMs)
}

async function checkRateLimitKey(
  key: string,
  action: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const config = RATE_LIMITS[action]
  if (!config) {
    return { allowed: true, remaining: 999, resetTime: new Date() }
  }

  const windowStart = new Date(Date.now() - config.windowMs)

  const currentCount = await prisma.rateLimit.aggregate({
    where: {
      ip: key,
      action,
      windowStart: {
        gte: windowStart,
      },
    },
    _sum: {
      count: true,
    },
  })

  const currentRequests = currentCount._sum.count || 0

  if (currentRequests >= config.maxRequests) {
    const nextWindowStart = new Date(windowStart.getTime() + config.windowMs)
    return {
      allowed: false,
      remaining: 0,
      resetTime: nextWindowStart,
    }
  }

  const bucketStart = getWindowBucket(config.windowMs)
  await prisma.rateLimit.upsert({
    where: {
      ip_action_windowStart: {
        ip: key,
        action,
        windowStart: bucketStart,
      },
    },
    update: {
      count: {
        increment: 1,
      },
      updatedAt: new Date(),
    },
    create: {
      ip: key,
      action,
      windowStart: bucketStart,
      count: 1,
    },
  })

  return {
    allowed: true,
    remaining: config.maxRequests - currentRequests - 1,
    resetTime: new Date(Date.now() + config.windowMs),
  }
}

export async function checkRateLimit(
  ip: string,
  action: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  return checkRateLimitKey(`ip:${ip}`, action)
}

export async function checkRateLimitScopes(params: {
  ip: string
  action: keyof typeof RATE_LIMITS
  userId?: string | null
}): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const ipResult = await checkRateLimitKey(`ip:${params.ip}`, params.action)
  if (!ipResult.allowed) return ipResult

  if (!params.userId) return ipResult

  const userResult = await checkRateLimitKey(`user:${params.userId}`, params.action)
  if (!userResult.allowed) return userResult

  return userResult.remaining < ipResult.remaining ? userResult : ipResult
}

export async function cleanupOldRateLimits() {
  const oldestAllowedTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
  
  await prisma.rateLimit.deleteMany({
    where: {
      createdAt: {
        lt: oldestAllowedTime
      }
    }
  })
} 