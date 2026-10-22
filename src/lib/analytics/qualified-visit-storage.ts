/**
 * sessionStorage once-per-URL guard for `qualified_visit`.
 * Fail-open if storage is unavailable (private mode / SSR / quota).
 */

export function qualifiedVisitStorageKey(pathname: string, search = ""): string {
  const q = search.startsWith("?") || search === "" ? search : `?${search}`
  return `qv:${pathname}${q}`
}

export function hasQualifiedVisitBeenSent(key: string): boolean {
  try {
    if (typeof sessionStorage === "undefined") return false
    return sessionStorage.getItem(key) === "1"
  } catch {
    return false
  }
}

export function markQualifiedVisitSent(key: string): void {
  try {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.setItem(key, "1")
  } catch {
    // ignore — in-memory fired flag still applies for this mount
  }
}
