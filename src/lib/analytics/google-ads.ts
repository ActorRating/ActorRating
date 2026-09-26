/**
 * Google Ads conversion pings on top of the existing gtag.js (GA4) snippet.
 *
 * PLACEHOLDER — create two conversion actions in Google Ads, then set:
 *   NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXX
 *   NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL=AbCdEfGhIj
 *   NEXT_PUBLIC_GOOGLE_ADS_FIRST_RATING_LABEL=KlMnOpQrSt
 *
 * Until those env vars are set, these calls no-op. GA4 sign_up and
 * first_rating_complete events still fire independently.
 */

type AdsConversion = "signup" | "first_rating"

function conversionSendTo(kind: AdsConversion): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim()
  const label =
    kind === "signup"
      ? process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL?.trim()
      : process.env.NEXT_PUBLIC_GOOGLE_ADS_FIRST_RATING_LABEL?.trim()
  if (!id || !label || id.includes("XXXXXXXX")) return null
  return `${id}/${label}`
}

export function trackGoogleAdsConversion(kind: AdsConversion) {
  if (typeof window === "undefined") return
  const sendTo = conversionSendTo(kind)
  if (!sendTo) return
  const gtag = window.gtag
  if (typeof gtag !== "function") return
  gtag("event", "conversion", { send_to: sendTo })
}
