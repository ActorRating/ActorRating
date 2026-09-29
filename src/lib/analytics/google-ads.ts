/**
 * Google Ads tag for this account. Loaded once from the root layout, on the
 * same gtag.js snippet as GA4 (Google says not to add a second Google tag).
 *
 * The Sign-up conversion fires from trackSignUp after the account exists.
 * First-rating still needs its own label:
 *   NEXT_PUBLIC_GOOGLE_ADS_FIRST_RATING_LABEL
 */
export const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "AW-18476384455"

const GOOGLE_ADS_SIGNUP_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL?.trim() || "6ITtCILKhIodEMeBnepE"

type AdsConversion = "signup" | "first_rating"

function conversionSendTo(kind: AdsConversion): string | null {
  const label =
    kind === "signup"
      ? GOOGLE_ADS_SIGNUP_LABEL
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
