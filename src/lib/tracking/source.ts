export const VALID_SOURCES = ["tiktok", "instagram", "youtube"] as const

export function isValidSource(
  value: string | null | undefined
): value is (typeof VALID_SOURCES)[number] {
  if (!value) return false
  return VALID_SOURCES.includes(value as (typeof VALID_SOURCES)[number])
}
