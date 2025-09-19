"use client"

import { useEffect } from "react"

// reCAPTCHA v3 hook for invisible verification
export function useRecaptchaV3() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  useEffect(() => {
    // Skip reCAPTCHA script loading in development mode on localhost to avoid external dependency during local dev
    if (
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ) {
      return
    }

    if (!siteKey) {
      console.warn("reCAPTCHA site key not found. Please set NEXT_PUBLIC_RECAPTCHA_SITE_KEY")
      return
    }

    console.log("Loading reCAPTCHA script with site key:", siteKey)

    // Check if script is already loaded
    if (document.querySelector(`script[src*="recaptcha/api.js"]`)) {
      console.log("reCAPTCHA script already loaded")
      return
    }

    // Load reCAPTCHA v3 script
    const script = document.createElement("script")
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      console.log("reCAPTCHA script loaded successfully")
    }
    
    script.onerror = () => {
      console.error("Failed to load reCAPTCHA script")
    }
    
    document.head.appendChild(script)

    return () => {
      const existingScript = document.querySelector(`script[src*="recaptcha/api.js"]`)
      if (existingScript) {
        document.head.removeChild(existingScript)
      }
    }
  }, [siteKey])

  const executeRecaptcha = async (action: string): Promise<string> => {
    if (!siteKey) {
      throw new Error("reCAPTCHA not configured")
    }

    // Development mode: return mock token for localhost
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `dev_mock_token_${action}_${Date.now()}`
    }

    // Wait for grecaptcha to be available with retry
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      if (typeof window !== "undefined" && (window as any).grecaptcha) {
        console.log("reCAPTCHA found, executing for action:", action)
        break
      }
      
      console.log(`Waiting for reCAPTCHA to load... attempt ${attempts + 1}/${maxAttempts}`)
      await new Promise(resolve => setTimeout(resolve, 500))
      attempts++
    }

    // Check if grecaptcha is available
    if (typeof window === "undefined" || !(window as any).grecaptcha) {
      console.error("reCAPTCHA not loaded after retries. grecaptcha object:", (window as any).grecaptcha)
      throw new Error("reCAPTCHA not loaded")
    }



    return new Promise((resolve, reject) => {
      try {
        (window as any).grecaptcha.ready(() => {
          (window as any).grecaptcha.execute(siteKey, { action }).then(resolve).catch(reject)
        })
      } catch (error) {
        console.error("Error executing reCAPTCHA:", error)
        reject(error)
      }
    })
  }

  return { executeRecaptcha }
} 