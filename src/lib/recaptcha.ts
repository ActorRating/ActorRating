export interface RecaptchaVerificationResult {
  success: boolean
  score?: number
  action?: string
  error?: string
}

export async function verifyRecaptchaV3(
  token: string,
  expectedAction: string,
  minScore: number = 0.5
): Promise<RecaptchaVerificationResult> {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY
    
    // Development mode: bypass reCAPTCHA verification for localhost
    if (
      process.env.NODE_ENV === 'development' &&
      (process.env.NEXTAUTH_URL?.includes('localhost') || process.env.VERCEL !== '1')
    ) {
      return {
        success: true,
        score: 1.0,
        action: expectedAction
      }
    }

    if (!secretKey) {
      console.error("reCAPTCHA secret key not configured")
      return {
        success: false,
        error: "reCAPTCHA not configured"
      }
    }

    // Verify the token with Google
    const verificationResponse = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }),
        // Keepalive can slightly reduce TTFB on some platforms
        keepalive: true,
      }
    )

    const verificationData = await verificationResponse.json()
    
    if (!verificationData.success) {
      console.error("reCAPTCHA verification failed:", verificationData['error-codes'])
      return {
        success: false,
        error: "reCAPTCHA verification failed"
      }
    }

    // Check score for v3 (0.0 to 1.0, where 1.0 is very likely a good interaction)
    if (verificationData.score !== undefined) {
      if (verificationData.score < minScore) {
        return {
          success: false,
          score: verificationData.score,
          error: "reCAPTCHA score too low"
        }
      }
    }

    // Check action for v3
    if (verificationData.action && verificationData.action !== expectedAction) {
      return {
        success: false,
        action: verificationData.action,
        error: "reCAPTCHA action mismatch"
      }
    }

    return {
      success: true,
      score: verificationData.score,
      action: verificationData.action
    }
  } catch (error) {
    console.error("reCAPTCHA verification error:", error)
    return {
      success: false,
      error: "Failed to verify reCAPTCHA"
    }
  }
} 