"use client"

const LOCK_KEY = "auth-in-progress"
const LOCK_TTL_MS = 15_000

type LockPayload = {
  at: number
  reason: string
}

function now(): number {
  return Date.now()
}

function readLock(): LockPayload | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LockPayload
    if (typeof parsed?.at !== "number") return null
    return parsed
  } catch {
    return null
  }
}

export function acquireAuthLock(reason: string): boolean {
  const existing = readLock()
  if (existing && now() - existing.at < LOCK_TTL_MS) {
    return false
  }
  try {
    localStorage.setItem(
      LOCK_KEY,
      JSON.stringify({
        at: now(),
        reason,
      } satisfies LockPayload)
    )
    return true
  } catch {
    return true
  }
}

export function releaseAuthLock(): void {
  try {
    localStorage.removeItem(LOCK_KEY)
  } catch {
    // no-op
  }
}

export function authLockRemainingMs(): number {
  const lock = readLock()
  if (!lock) return 0
  const elapsed = now() - lock.at
  return Math.max(0, LOCK_TTL_MS - elapsed)
}
