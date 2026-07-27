import { signIn } from "next-auth/react"
import { MAGIC_LINK_HONEYPOT_FIELD } from "@/lib/auth/magicLinkHoneypot"

type RequestMagicLinkArgs = {
  email: string
  /** Honeypot value — must be empty for real users. */
  companyUrl?: string
  callbackUrl: string
}

type RequestMagicLinkResult =
  | { ok: true; fake?: boolean }
  | { ok: false; code: string; message: string }

/**
 * Client helper: honeypot gate → NextAuth email signIn.
 * Filled honeypot returns a fake success without hitting Auth.js.
 */
export async function requestMagicLink({
  email,
  companyUrl = "",
  callbackUrl,
}: RequestMagicLinkArgs): Promise<RequestMagicLinkResult> {
  const normalizedEmail = email.trim().toLowerCase()

  // Client-side trap: never call APIs if a bot filled the hidden field.
  if (companyUrl.trim()) {
    return { ok: true, fake: true }
  }

  const gateRes = await fetch("/api/auth/magic-link-gate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: normalizedEmail,
      [MAGIC_LINK_HONEYPOT_FIELD]: companyUrl,
    }),
  })

  const gateData = (await gateRes.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
    code?: string
  }

  if (!gateRes.ok) {
    const code = gateData.code || "GATE_FAILED"
    return {
      ok: false,
      code,
      message:
        code === "DISPOSABLE_EMAIL"
          ? "Please use a valid email provider."
          : gateData.error || "Unable to send magic link. Please try again.",
    }
  }

  const result = await signIn("email", {
    email: normalizedEmail,
    callbackUrl,
    redirect: false,
  })

  if (result?.error) {
    const err = result.error
    if (err.includes("RATE_LIMIT")) {
      return { ok: false, code: "RATE_LIMIT", message: "Too many requests, try again later." }
    }
    if (err.includes("DISPOSABLE_EMAIL")) {
      return {
        ok: false,
        code: "DISPOSABLE_EMAIL",
        message: "Please use a valid email provider.",
      }
    }
    if (err.includes("GATE_REQUIRED")) {
      return {
        ok: false,
        code: "GATE_REQUIRED",
        message: "Unable to send magic link. Please try again.",
      }
    }
    return {
      ok: false,
      code: "EmailSignin",
      message: "Unable to send magic link. Please try again.",
    }
  }

  return { ok: true }
}
