/**
 * Google Ads tag for this account. Loaded once from the root layout, on the
 * same gtag.js snippet as GA4 (Google says not to add a second Google tag).
 *
 * Sign-up fires from trackSignUp after the account exists.
 * First rating reads this env var exactly (Next inlines the direct access):
 *   NEXT_PUBLIC_GOOGLE_ADS_FIRST_RATING_LABEL
 */
export const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "AW-18476384455"

const GOOGLE_ADS_SIGNUP_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL?.trim() || "6ITtCILKhIodEMeBnepE"

/** Must stay `NEXT_PUBLIC_GOOGLE_ADS_FIRST_RATING_LABEL` — Next only inlines that literal. */
const GOOGLE_ADS_FIRST_RATING_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_FIRST_RATING_LABEL?.trim() || "NzBJCJOlrIodEMeBnepE"

type AdsConversion = "signup" | "first_rating"

function conversionSendTo(kind: AdsConversion): string | null {
  const label = kind === "signup" ? GOOGLE_ADS_SIGNUP_LABEL : GOOGLE_ADS_FIRST_RATING_LABEL
  if (!GOOGLE_ADS_ID || !label) return null
  return `${GOOGLE_ADS_ID}/${label}`
}

/**
 * Queue an Ads conversion. Resolves true only after gtag's event_callback,
 * which runs when the hit is actually sent. Resolves false if there is nothing
 * to send (missing label). Stays pending if the tag never processes the hit.
 */
export function trackGoogleAdsConversion(kind: AdsConversion): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false)
  const sendTo = conversionSendTo(kind)
  if (!sendTo) return Promise.resolve(false)

  return new Promise((resolve) => {
    let settled = false
    const onSent = () => {
      if (settled) return
      settled = true
      resolve(true)
    }
    const params: Record<string, unknown> = { send_to: sendTo, event_callback: onSent }
    if (kind === "first_rating") {
      params.value = 1.0
      params.currency = "TRY"
    }
    window.dataLayer = window.dataLayer || []
    if (typeof window.gtag === "function") {
      window.gtag("event", "conversion", params)
      return
    }
    // gtag.js may still be loading. push() is what gtag() does internally, and
    // the inline init keeps this array (`dataLayer = dataLayer || []`).
    window.dataLayer.push(["event", "conversion", params])
  })
}
