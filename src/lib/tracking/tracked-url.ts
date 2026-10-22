/**
 * Build absolute ActorRating URLs with UTM query params for off-site posts.
 * See docs/utm-social-links.md.
 */

const DEFAULT_BASE =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

export type TrackedUrlParams = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  /** Alias counted like utm_source in acquisition cookies. */
  src?: string
}

export function buildTrackedUrl(
  path: string,
  params: TrackedUrlParams,
  baseUrl: string = DEFAULT_BASE,
): string {
  const base = baseUrl.replace(/\/$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const url = new URL(`${base}${normalizedPath}`)
  const entries: Array<[string, string | undefined]> = [
    ["utm_source", params.utm_source],
    ["utm_medium", params.utm_medium],
    ["utm_campaign", params.utm_campaign],
    ["utm_content", params.utm_content],
    ["utm_term", params.utm_term],
    ["src", params.src],
  ]
  for (const [key, value] of entries) {
    const v = value?.trim()
    if (v) url.searchParams.set(key, v)
  }
  return url.toString()
}
