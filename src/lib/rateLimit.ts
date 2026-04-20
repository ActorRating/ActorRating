import { prisma } from "@/lib/prisma"

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  rating: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 ratings per minute (increased for testing)
  byLookup: { windowMs: 60 * 1000, maxRequests: 120 },
  og: { windowMs: 60 * 1000, maxRequests: 60 },
}

export async function checkRateLimit(
  ip: string,
  action: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const config = RATE_LIMITS[action]
  if (!config) {
    return { allowed: true, remaining: 999, resetTime: new Date() }
  }

  const windowStart = new Date(Date.now() - config.windowMs)
  
  // Get current count for this IP and action in the current window
  const currentCount = await prisma.rateLimit.aggregate({
    where: {
      ip,
      action,
      windowStart: {
        gte: windowStart
      }
    },
    _sum: {
      count: true
    }
  })

  const currentRequests = currentCount._sum.count || 0
  
  if (currentRequests >= config.maxRequests) {
    // Find the next window start time
    const nextWindowStart = new Date(windowStart.getTime() + config.windowMs)
    return {
      allowed: false,
      remaining: 0,
      resetTime: nextWindowStart
    }
  }

  // Record this request
  await prisma.rateLimit.upsert({
    where: {
      ip_action_windowStart: {
        ip,
        action,
        windowStart: new Date(Math.floor(Date.now() / config.windowMs) * config.windowMs)
      }
    },
    update: {
      count: {
        increment: 1
      },
      updatedAt: new Date()
    },
    create: {
      ip,
      action,
      windowStart: new Date(Math.floor(Date.now() / config.windowMs) * config.windowMs),
      count: 1
    }
  })

  return {
    allowed: true,
    remaining: config.maxRequests - currentRequests - 1,
    resetTime: new Date(Date.now() + config.windowMs)
  }
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