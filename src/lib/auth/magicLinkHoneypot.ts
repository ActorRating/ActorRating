/** Honeypot field name used on magic-link forms (must stay empty). Safe for client + server. */
export const MAGIC_LINK_HONEYPOT_FIELD = "company_url"

export function isHoneypotTriggered(value: unknown): boolean {
  if (typeof value !== "string") return Boolean(value)
  return value.trim().length > 0
}
