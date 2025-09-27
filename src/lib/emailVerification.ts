import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { Resend } from "resend"

export async function generateVerificationToken(identifier: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  // Since verification fields were removed, just return the token
  // This can be stored in a separate table or handled differently in the future
  return token
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Since verification fields were removed, this function is no longer functional
  // Return an error indicating the feature is not available
  return { success: false, error: "Email verification is not currently available" }
}

export async function checkVerifiedRaterStatus(userId: string): Promise<void> {
  // Since isVerifiedRater field was removed, this function is no longer functional
  // This can be implemented differently in the future if needed
  return
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.APP_URL || ""
  const verificationUrl = `${baseUrl}/verify?token=${token}`

  const from = process.env.EMAIL_FROM || "ActorRating <noreply@actorrating.com>"
  const subject = "Confirm your ActorRating account"
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111">
      <h2>Confirm your ActorRating account</h2>
      <p>Thanks for signing up! Please confirm your email to activate your account.</p>
      <p>
        <a href="${verificationUrl}" style="display:inline-block;padding:10px 16px;background:#6d28d9;color:#fff;text-decoration:none;border-radius:6px">
          Verify Email
        </a>
      </p>
      <p>Or paste this link into your browser:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This link will expire in 24 hours.</p>
    </div>
  `

  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from,
        to: email,
        subject,
        html,
      })
    } else {
      // Fallback to console log in local/dev
      console.log(`Verification email for ${email}: ${verificationUrl}`)
    }
  } catch (err) {
    console.error("Failed to send verification email", err)
    // Do not throw to avoid leaking sender errors to the user; they can request resend
  }
} 