import type { StoredAttribution } from "@/lib/tracking/attribution-cookies"

export type EventAttribution = StoredAttribution

const EMPTY_ATTRIBUTION: EventAttribution = {
  source: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
}

let cachedAttribution: EventAttribution | null = null
let inflight: Promise<EventAttribution> | null = null

function readUtmFromUrl(): Partial<EventAttribution> {
  if (typeof window === "undefined") return {}

  const params = new URLSearchParams(window.location.search)
  const utmSource = params.get("utm_source")?.trim().toLowerCase() || null
  const utmMedium = params.get("utm_medium")?.trim() || null
  const utmCampaign = params.get("utm_campaign")?.trim() || null
  const utmContent = params.get("utm_content")?.trim() || null
  const src = params.get("src")?.trim().toLowerCase() || null

  if (!utmSource && !utmMedium && !utmCampaign && !utmContent && !src) {
    return {}
  }

  return {
    source: utmSource || src,
    utm_source: utmSource || src,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
  }
}

function mergeAttribution(
  base: EventAttribution,
  overlay: Partial<EventAttribution>,
): EventAttribution {
  return {
    source: overlay.source ?? base.source,
    utm_source: overlay.utm_source ?? base.utm_source,
    utm_medium: overlay.utm_medium ?? base.utm_medium,
    utm_campaign: overlay.utm_campaign ?? base.utm_campaign,
    utm_content: overlay.utm_content ?? base.utm_content,
  }
}

/** First-touch attribution for client events (ar_src + UTM cookies, with URL fallback). */
export async function resolveEventAttribution(): Promise<EventAttribution> {
  if (cachedAttribution) {
    return mergeAttribution(cachedAttribution, readUtmFromUrl())
  }
  if (inflight) return inflight

  inflight = fetch("/api/analytics/attribution", { credentials: "same-origin" })
    .then(async (res) => {
      if (!res.ok) return EMPTY_ATTRIBUTION
      return (await res.json()) as EventAttribution
    })
    .catch(() => EMPTY_ATTRIBUTION)
    .then((fromServer) => {
      cachedAttribution = fromServer
      return mergeAttribution(fromServer, readUtmFromUrl())
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function primeEventAttribution(attribution: EventAttribution) {
  cachedAttribution = attribution
}
