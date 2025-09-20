import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { Resend } from "resend"

export async function generateVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  // Try new column first; fall back to legacy column if needed (during migration windows)
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        verificationToken: token,
        verificationExpiry: expiresAt,
      }
    })
  } catch (error: unknown) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        verificationToken: token,
        // @ts-expect-error legacy field for backward-compat
        verificationTokenExpires: expiresAt,
      }
    })
  }

  return token
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { verificationToken: token }
  })

  if (!user) {
    return { success: false, error: "Invalid verification token" }
  }

  const expiry: Date | null = (user as { verificationExpiry?: Date | null; verificationTokenExpires?: Date | null }).verificationExpiry || (user as { verificationExpiry?: Date | null; verificationTokenExpires?: Date | null }).verificationTokenExpires || null
  if (!expiry || expiry < new Date()) {
    return { success: false, error: "Verification token has expired" }
  }

  // Mark email as verified (try new columns, fall back to legacy)
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationToken: null,
        verificationExpiry: null
      }
    })
  } catch (error: unknown) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationToken: null,
        // @ts-expect-error legacy field for backward-compat
        verificationTokenExpires: null
      }
    })
  }

  return { success: true, userId: user.id }
}

export async function checkVerifiedRaterStatus(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { ratings: true }
      }
    }
  })

  if (!user) return

  // Check if user qualifies as verified rater
  const isVerified = user.emailVerifiedAt && user._count.ratings >= 3

  if (isVerified && !user.isVerifiedRater) {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerifiedRater: true }
    })
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || ""
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