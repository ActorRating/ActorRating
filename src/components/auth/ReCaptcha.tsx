"use client"

import { useEffect } from "react"

const isDev = process.env.NODE_ENV === "development"

// reCAPTCHA v3 hook for invisible verification
export function useRecaptchaV3() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  useEffect(() => {
    // Skip reCAPTCHA script loading in development mode on localhost to avoid external dependency during local dev
    if (isDev && typeof window !== "undefined" && window.location.hostname === "localhost") {
      return
    }

    if (!siteKey) {
      if (isDev) {
        console.warn("reCAPTCHA site key not found. Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY")
      }
      return
    }

    if (document.querySelector(`script[src*="recaptcha/api.js"]`)) {
      return
    }

    const script = document.createElement("script")
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.defer = true
    script.onerror = () => {
      if (isDev) console.warn("reCAPTCHA script failed to load (blocked or network error)")
    }
    document.head.appendChild(script)

    return () => {
      const existingScript = document.querySelector(`script[src*="recaptcha/api.js"]`)
      if (existingScript?.parentNode) {
        existingScript.parentNode.removeChild(existingScript)
      }
    }
  }, [siteKey])

  const executeRecaptcha = async (action: string): Promise<string> => {
    if (!siteKey) {
      throw new Error("reCAPTCHA not configured")
    }

    if (isDev && typeof window !== "undefined" && window.location.hostname === "localhost") {
      return `dev_mock_token_${action}_${Date.now()}`
    }

    let attempts = 0
    const maxAttempts = 10
    while (attempts < maxAttempts) {
      if (typeof window !== "undefined" && (window as any).grecaptcha) break
      await new Promise((r) => setTimeout(r, 500))
      attempts++
    }

    if (typeof window === "undefined" || !(window as any).grecaptcha) {
      throw new Error("reCAPTCHA didn’t load. Check your connection or try again.")
    }

    return new Promise((resolve, reject) => {
      try {
        (window as any).grecaptcha.ready(() => {
          (window as any).grecaptcha
            .execute(siteKey, { action })
            .then(resolve)
            .catch((err: unknown) => {
              // 401 / network / blocked by extension — give a clear message
              if (isDev) console.warn("reCAPTCHA execute failed:", err)
              reject(new Error("Verification failed. Try again or disable ad blockers for this site."))
            })
        })
      } catch (err) {
        if (isDev) console.warn("reCAPTCHA execute error:", err)
        reject(new Error("Verification failed. Try again."))
      }
    })
  }

  return { executeRecaptcha }
} 