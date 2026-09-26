/**
 * Google Ads tag for this account. Loaded once from the root layout, on the
 * same gtag.js snippet as GA4 (Google says not to add a second Google tag).
 *
 * Conversion labels still come from env, after each action is created in Ads:
 *   NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL
 *   NEXT_PUBLIC_GOOGLE_ADS_FIRST_RATING_LABEL
 */
export const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "AW-18476384455"

type AdsConversion = "signup" | "first_rating"

function conversionSendTo(kind: AdsConversion): string | null {
  const label =
    kind === "signup"
      ? process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL?.trim()
      : process.env.NEXT_PUBLIC_GOOGLE_ADS_FIRST_RATING_LABEL?.trim()
  if (!GOOGLE_ADS_ID || !label) return null
  return `${GOOGLE_ADS_ID}/${label}`
}

export function trackGoogleAdsConversion(kind: AdsConversion) {
  if (typeof window === "undefined") return
  const sendTo = conversionSendTo(kind)
  if (!sendTo) return
  const gtag = window.gtag
  if (typeof gtag !== "function") return
  gtag("event", "conversion", { send_to: sendTo })
}
