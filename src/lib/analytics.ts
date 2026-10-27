/**
 * Google Analytics 4 (GA4) Event Tracking
 * All events are wrapped with safety checks to prevent errors
 */

import { resolveEventAttribution } from "@/lib/analytics/attribution"

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
    umami?: {
      track: (eventName: string, payload?: Record<string, any>) => void
    }
  }
}

type MixpanelEventDetail = {
  event: string
  payload?: Record<string, any>
}

export type AuthStatus = "guest" | "authenticated"
export type RatingTiming = "first" | "repeat"

export type AnalyticsAttribution = {
  source?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_term?: string | null
  utm_content?: string | null
}

type PerformanceEventInput = {
  actor: string
  movie: string
  year?: number
  auth_status: AuthStatus
} & AnalyticsAttribution

type RatingSubmittedInput = PerformanceEventInput & {
  overall_score: number
  rating_timing: RatingTiming
}

type SignupStartedInput = {
  trigger: string
  auth_status?: AuthStatus
} & AnalyticsAttribution

type SearchUsedInput = {
  query: string
  surface?: string
  result_count?: number
} & AnalyticsAttribution

/**
 * Safety check wrapper for gtag calls
 */
function safeGtag(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, eventParams)
  }
}

/**
 * Dispatch custom Mixpanel track events from one analytics hub.
 * Mixpanel provider listens to this event and forwards it to SDK.
 */
function safeMixpanelTrack(event: string, payload?: Record<string, any>) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<MixpanelEventDetail>("mixpanel:track", {
      detail: { event, payload },
    }),
  )
}

/**
 * Safe wrapper for Umami event tracking.
 */
function safeUmamiTrack(event: string, payload?: Record<string, any>) {
  if (typeof window === "undefined" || !window.umami) return
  window.umami.track(event, payload)
}

function withAttribution<T extends AnalyticsAttribution>(
  payload: T,
  attribution: AnalyticsAttribution,
): T & AnalyticsAttribution {
  return {
    ...payload,
    source: payload.source ?? attribution.source ?? null,
    utm_source: payload.utm_source ?? attribution.utm_source ?? null,
    utm_medium: payload.utm_medium ?? attribution.utm_medium ?? null,
    utm_campaign: payload.utm_campaign ?? attribution.utm_campaign ?? null,
    utm_term: payload.utm_term ?? attribution.utm_term ?? null,
    utm_content: payload.utm_content ?? attribution.utm_content ?? null,
  }
}

function trackEvent(
  gaName: string,
  mixpanelName: string,
  umamiName: string,
  payload: Record<string, any>,
) {
  safeGtag(gaName, payload)
  safeMixpanelTrack(mixpanelName, payload)
  safeUmamiTrack(umamiName, payload)
}

function trackEventWithAttribution(
  gaName: string,
  mixpanelName: string,
  umamiName: string,
  payload: AnalyticsAttribution & Record<string, any>,
  options?: { firstParty?: boolean },
) {
  void resolveEventAttribution().then((attribution) => {
    const enriched = withAttribution(payload, attribution)
    trackEvent(gaName, mixpanelName, umamiName, enriched)
    if (options?.firstParty !== false) {
      beaconFirstPartyEvent(gaName, enriched)
    }
  })
}

const FIRST_PARTY_EVENT_NAMES = new Set([
  "performance_viewed",
  "rating_slider_moved",
  "rating_submitted",
  "signup_started",
  "search_used",
  "qualified_visit",
  "hub_view",
  "hub_rate_click",
  "home_rate_click",
  "faceoff_started",
  "faceoff_matchup_viewed",
  "faceoff_vote_submitted",
  "faceoff_results_viewed",
  "faceoff_continued",
  "faceoff_shared",
  "faceoff_signup_started",
  "faceoff_signup_completed",
  "faceoff_returned",
  "faceoff_homepage_click",
])

function beaconFirstPartyEvent(
  name: string,
  payload: AnalyticsAttribution & Record<string, any>,
) {
  if (typeof window === "undefined" || !FIRST_PARTY_EVENT_NAMES.has(name)) return

  const {
    actor,
    movie,
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    ...properties
  } = payload

  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      path: window.location.pathname,
      actor: typeof actor === "string" ? actor : undefined,
      movie: typeof movie === "string" ? movie : undefined,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      properties,
    }),
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {})
}

let lastSearchTrack: { query: string; at: number } | null = null

function shouldTrackSearch(query: string) {
  const now = Date.now()
  if (
    lastSearchTrack &&
    lastSearchTrack.query === query &&
    now - lastSearchTrack.at < 3000
  ) {
    return false
  }
  lastSearchTrack = { query, at: now }
  return true
}

const SIGNUP_ANALYTICS_KEY = "signup_analytics_tracked"

/**
 * 1. Signup Success Event
 * Fires when user successfully completes signup (Google or email).
 * Resolves true only after the Google Ads conversion hit is confirmed sent.
 */
export function trackSignUp(method: "google" | "email"): Promise<boolean> {
  if (typeof window === "undefined" || !localStorage.getItem(SIGNUP_ANALYTICS_KEY)) {
    trackEventWithAttribution("sign_up", "User Signed Up", "user_signed_up", {
      method,
      signup_method: method,
    })
    if (typeof window !== "undefined") {
      localStorage.setItem(SIGNUP_ANALYTICS_KEY, method)
    }
  }
  return import("@/lib/analytics/google-ads").then(({ trackGoogleAdsConversion }) =>
    trackGoogleAdsConversion("signup"),
  )
}

/**
 * Sign In Event
 * Fires when user successfully signs into an existing account.
 */
export function trackSignIn(method: "google" | "email", success = true) {
  trackEventWithAttribution("login", "User Logged In", "user_logged_in", {
    method,
    login_method: method,
    success,
  })
}

/**
 * Performance page viewed — canonical /rate/[movie]/[actor] entry.
 */
export function trackPerformanceViewed(input: PerformanceEventInput) {
  trackEventWithAttribution(
    "performance_viewed",
    "Performance Viewed",
    "performance_viewed",
    {
      actor: input.actor,
      movie: input.movie,
      year: input.year,
      auth_status: input.auth_status,
    },
  )
}

/**
 * Engaged page load: tab visible ≥5s + real interaction (once per load).
 * First-party ProductEvent only via beacon; attribution matches pageview cookies.
 */
export function trackQualifiedVisit(input?: {
  interaction?: string | null
  dwell_ms?: number
  /** PageView row id from the pageview beacon so the server can mark it engaged. */
  pageview_id?: string | null
}) {
  trackEventWithAttribution(
    "qualified_visit",
    "Qualified Visit",
    "qualified_visit",
    {
      interaction: input?.interaction ?? null,
      dwell_ms: input?.dwell_ms ?? null,
      ...(input?.pageview_id ? { pageview_id: input.pageview_id } : {}),
    },
  )
}

/** Best-performances hub page view (first-party ProductEvent). */
export function trackHubView(input: {
  movie: string
  movie_slug: string
}) {
  trackEventWithAttribution("hub_view", "Hub View", "hub_view", {
    movie: input.movie,
    movie_slug: input.movie_slug,
  })
}

/** Rate CTA click from a best-performances hub (includes performance id). */
export function trackHubRateClick(input: {
  performance_id: string
  movie: string
  movie_slug: string
}) {
  trackEventWithAttribution("hub_rate_click", "Hub Rate Click", "hub_rate_click", {
    performance_id: input.performance_id,
    movie: input.movie,
    movie_slug: input.movie_slug,
  })
}

/** Homepage "Rate a Performance" CTA (hero or closing strip). */
export function trackHomeRateClick(button: "hero" | "closing") {
  trackEventWithAttribution("home_rate_click", "Home Rate Click", "home_rate_click", {
    button,
  })
}

/**
 * Rating Flow Started Event (legacy /rate query entry)
 */
export function trackRateStart(actor: string, movie: string, year: number) {
  trackEventWithAttribution("rate_start", "Rate Start", "rate_start", {
    actor,
    movie,
    year,
    auth_status: "guest",
  })
}

/**
 * Rating Submitted Event (MOST IMPORTANT)
 * Fires when rating is successfully saved and confirmation UI appears
 */
export function trackRateSubmit(input: RatingSubmittedInput) {
  const payload = {
    actor: input.actor,
    movie: input.movie,
    year: input.year,
    overall_score: input.overall_score,
    auth_status: input.auth_status,
    rating_timing: input.rating_timing,
    guest: input.auth_status === "guest",
    first_rating: input.rating_timing === "first",
  }

  trackEventWithAttribution(
    "rating_submitted",
    "Rating Submitted",
    "rating_submitted",
    payload,
  )

  // Legacy GA event name for existing dashboards (no duplicate first-party row)
  trackEventWithAttribution(
    "rate_submit",
    "Rated Actor",
    "rated_actor",
    {
      ...payload,
      actor_name: input.actor,
      score: input.overall_score,
    },
    { firstParty: false },
  )
}

/**
 * First slider interaction on a performance page.
 */
export function trackRatingSliderMoved(
  input: PerformanceEventInput & { score?: number },
) {
  trackEventWithAttribution(
    "rating_slider_moved",
    "Rating Slider Moved",
    "rating_slider_moved",
    {
      actor: input.actor,
      movie: input.movie,
      year: input.year,
      auth_status: input.auth_status,
      score: input.score,
    },
  )
}

/**
 * Signup flow started — modal open, register page, etc.
 */
export function trackSignupStarted(input: SignupStartedInput) {
  trackEventWithAttribution(
    "signup_started",
    "Signup Started",
    "signup_started",
    {
      trigger: input.trigger,
      auth_status: input.auth_status ?? "guest",
    },
  )
}

/**
 * Search used — text query submitted.
 */
export function trackSearchUsed(input: SearchUsedInput) {
  const query = input.query.trim()
  if (!query || !shouldTrackSearch(query.toLowerCase())) return

  trackEventWithAttribution("search_used", "Search Used", "search_used", {
    query,
    surface: input.surface,
    result_count: input.result_count,
  })
}

/**
 * 4. Share Triggered Event
 * Fires when user clicks any share button after submission
 */
export function trackShareRating(platform: "native" | "twitter" | "facebook" | "instagram") {
  trackEventWithAttribution("share_rating", "Share Rating", "share_rating", {
    platform,
  })
}

const FIRST_RATING_ANALYTICS_KEY = "first_rating_analytics_tracked"

/**
 * 5. First-Time Activation Event
 * Fires ONLY ONCE per user when they submit their first-ever rating.
 * The Ads hit is marked done only after Google confirms it was sent.
 */
export function trackFirstRatingComplete() {
  if (typeof window === "undefined") return
  if (localStorage.getItem("first_rating_done")) return

  if (!localStorage.getItem(FIRST_RATING_ANALYTICS_KEY)) {
    trackEventWithAttribution(
      "first_rating_complete",
      "First Rating Complete",
      "first_rating_complete",
      {},
    )
    localStorage.setItem(FIRST_RATING_ANALYTICS_KEY, "1")
  }

  void import("@/lib/analytics/google-ads")
    .then(({ trackGoogleAdsConversion }) => trackGoogleAdsConversion("first_rating"))
    .then((sent) => {
      if (!sent) return
      localStorage.setItem("first_rating_done", "true")
      localStorage.removeItem(FIRST_RATING_ANALYTICS_KEY)
    })
    .catch(() => {})
}

const faceOffDedupe = new Set<string>()

export function trackFaceOff(
  name:
    | "faceoff_started"
    | "faceoff_matchup_viewed"
    | "faceoff_vote_submitted"
    | "faceoff_results_viewed"
    | "faceoff_continued"
    | "faceoff_shared"
    | "faceoff_signup_started"
    | "faceoff_signup_completed"
    | "faceoff_returned"
    | "faceoff_homepage_click",
  properties: Record<string, string | number | boolean | null | undefined> = {},
  dedupeKey?: string,
) {
  if (dedupeKey) {
    if (faceOffDedupe.has(dedupeKey)) return
    faceOffDedupe.add(dedupeKey)
  }
  const safe: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (value == null) continue
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value
    }
  }
  trackEventWithAttribution(name, name, name, safe)
}

export function getRatingTiming(options: {
  authStatus: AuthStatus
  guestRatingsBeforeSubmit?: number
  hasExistingRating?: boolean
}): RatingTiming {
  if (options.hasExistingRating) return "repeat"
  if (
    typeof window !== "undefined" &&
    (localStorage.getItem("first_rating_done") || localStorage.getItem(FIRST_RATING_ANALYTICS_KEY))
  ) {
    return "repeat"
  }
  if (options.authStatus === "guest" && (options.guestRatingsBeforeSubmit ?? 0) > 0) {
    return "repeat"
  }
  return "first"
}
