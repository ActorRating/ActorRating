export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "auth",
  "profile",
  "dashboard",
  "support",
])

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  const normalized = normalizeUsername(username)
  if (!USERNAME_PATTERN.test(normalized)) return false
  return !RESERVED_USERNAMES.has(normalized)
}

