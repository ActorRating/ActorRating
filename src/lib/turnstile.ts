import "server-only"

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export type TurnstileVerifyResult =
  | { success: true }
  | { success: false; error: string }

/** Server-side Cloudflare Turnstile verification. Skips in dev when secret unset. */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return { success: true }
    }
    return { success: false, error: "Turnstile is not configured" }
  }

  if (!token || typeof token !== "string" || token.length < 10) {
    return { success: false, error: "Turnstile token is required" }
  }

  if (
    token === "dev-turnstile-bypass" &&
    process.env.NODE_ENV !== "production"
  ) {
    return { success: true }
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  })
  if (remoteIp) body.set("remoteip", remoteIp)

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] }
    if (data.success) return { success: true }
    const codes = data["error-codes"]?.join(", ") ?? "verification failed"
    return { success: false, error: codes }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),
  )
}
