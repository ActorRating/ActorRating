"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { signIn, signOut } from "next-auth/react"
import { FcGoogle } from "react-icons/fc"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import { MagicLinkHoneypot } from "@/components/auth/MagicLinkHoneypot"
import { acquireAuthLock, authLockRemainingMs, releaseAuthLock } from "@/lib/auth/clientAuthLock"
import { requestMagicLink } from "@/lib/auth/requestMagicLink"
import { trackSignupStarted } from "@/lib/analytics"

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_AVAILABLE === "1"

interface SignUpToSaveModalProps {
  isOpen: boolean
  onClose: () => void
  totalScore: number
  actorName: string
  movieTitle: string
  movieYear: number
  ratingData: {
    emotionalDepth: number
    believability: number
    technicalSkill: number
    screenPresence: number
    chemistry: number
    actorId: string
    movieId: string
    comment?: string
  }
  /**
   * 'single'   — original behaviour: "save this rating" prompt (default)
   * 'momentum' — "you're on a roll" prompt shown after GUEST_RATING_LIMIT submissions
   */
  variant?: "single" | "momentum"
  /** Number of performances already rated as guest (used in momentum copy). */
  guestRatingsCount?: number
}

export function SignUpToSaveModal({
  isOpen,
  onClose,
  totalScore,
  actorName,
  movieTitle,
  movieYear,
  ratingData,
  variant = "single",
  guestRatingsCount = 0,
}: SignUpToSaveModalProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [companyUrl, setCompanyUrl] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isGoogleBusy, setIsGoogleBusy] = useState(false)

  // The callback URL that processes guestRatings + pendingRating after auth.
  // /auth/signup-success is honored by the NextAuth redirect callback because
  // it starts with /auth/, so it survives both Google OAuth and email magic-link.
  const AUTH_CALLBACK = "/auth/signup-success"

  useEffect(() => {
    if (!isOpen) return
    trackSignupStarted({
      trigger: variant === "momentum" ? "rating_momentum_modal" : "rating_save_modal",
      auth_status: "guest",
    })
  }, [isOpen, variant])

  const persistPendingRating = () => {
    if (typeof window === "undefined") return
    localStorage.setItem(
      "pendingRating",
      JSON.stringify({
        actorId: ratingData.actorId,
        movieId: ratingData.movieId,
        emotionalRangeDepth: ratingData.emotionalDepth,
        characterBelievability: ratingData.believability,
        technicalSkill: ratingData.technicalSkill,
        screenPresence: ratingData.screenPresence,
        chemistryInteraction: ratingData.chemistry,
        comment: ratingData.comment,
        actorName,
        movieTitle,
        movieYear,
        timestamp: new Date().toISOString(),
      })
    )
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const origOverflow = document.body.style.overflow
    const origPadding = document.body.style.paddingRight
    const origPosition = document.body.style.position
    const origTop = document.body.style.top
    const origWidth = document.body.style.width
    const scrollY = window.scrollY

    document.body.style.overflow = "hidden"
    document.body.style.paddingRight = `${scrollbarWidth}px`
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    document.documentElement.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = origOverflow
      document.body.style.paddingRight = origPadding
      document.body.style.position = origPosition
      document.body.style.top = origTop
      document.body.style.width = origWidth
      document.documentElement.style.overflow = ""
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  // ─── Single variant handlers (original behaviour) ────────────────────────

  const handleContinueWithEmail = () => {
    persistPendingRating()
    router.push("/auth/register")
  }

  const handleSignIn = () => {
    persistPendingRating()
    router.push("/auth/signin")
  }

  // ─── Momentum variant handlers ───────────────────────────────────────────

  const handleGoogleSignIn = () => {
    if (!acquireAuthLock("google-signin")) {
      const seconds = Math.ceil(authLockRemainingMs() / 1000)
      console.warn(`[auth] Google auth blocked: another auth flow in progress (${seconds}s)`)
      return
    }
    persistPendingRating()
    setIsGoogleBusy(true)
    void (async () => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("pending_signup_method", "google")
        }
        await signOut({ redirect: false })
      } catch (err) {
        console.warn("[auth][google] pre-signout failed", err)
      }
      await signIn("google", { callbackUrl: AUTH_CALLBACK })
      setTimeout(() => releaseAuthLock(), 15_000)
    })().catch(() => {
      releaseAuthLock()
      setIsGoogleBusy(false)
    })
  }

  const handleMagicLink = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.")
      return
    }
    setEmailError("")
    setIsSendingEmail(true)
    persistPendingRating()
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("pending_signup_method", "email")
      }
      const result = await requestMagicLink({
        email: email.trim(),
        companyUrl,
        callbackUrl: AUTH_CALLBACK,
      })
      if (!result.ok) {
        setEmailError(result.message)
        return
      }
      setEmailSent(true)
    } catch {
      setEmailError("Failed to send magic link. Please try again.")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[99998]"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh", minHeight: "100vh" }}
            onClick={handleClose}
          />

          {/* Modal container */}
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 pointer-events-none"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh", minHeight: "100vh", overflow: "hidden" }}
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.3 }}
              className="relative max-w-md w-full rounded-[2rem] p-6 sm:p-7 md:p-8 pointer-events-auto my-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(to bottom right, rgba(26,26,26,0.95), rgba(15,15,15,0.90), rgba(0,0,0,0.95))",
                backdropFilter: "blur(32px)",
                border: "1px solid rgba(255,255,255,0.05)",
                boxShadow: "0 25px 70px -15px rgba(0,0,0,0.9), 0 15px 40px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 0 rgba(255,255,255,0.1), inset 0 -1px 0 0 rgba(0,0,0,0.3)",
                transform: "translateY(-6px) perspective(1000px) rotateX(1.5deg)",
                transformStyle: "preserve-3d",
                maxHeight: "calc(100vh - 2rem)",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 z-10"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* ── Score card ───────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                className="text-center mb-5 sm:mb-6 mt-12 sm:mt-0"
              >
                <div
                  className="relative backdrop-blur-xl rounded-3xl px-6 sm:px-8 py-6 sm:py-8 shadow-2xl mx-auto flex items-center justify-center overflow-hidden"
                  style={{
                    width: "clamp(200px,85%,280px)",
                    maxWidth: "280px",
                    minHeight: "clamp(120px,18vh,150px)",
                    background: "rgba(26,26,26,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 12px 45px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)",
                    transform: "perspective(1000px) rotateX(2deg) translateZ(20px)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="relative text-center z-10 w-full px-2">
                    <div className="font-black flex items-baseline justify-center gap-1 sm:gap-1.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                      <span
                        className="inline-block text-5xl sm:text-6xl md:text-7xl"
                        style={{
                          background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          lineHeight: "1",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {totalScore}
                      </span>
                      <span className="text-xl sm:text-2xl md:text-3xl text-[#a1a1aa] leading-none">/10</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── Actor / movie info ────────────────────────────────────────── */}
              <div className="text-center mb-5 sm:mb-6">
                <p className="text-white font-semibold text-xl sm:text-2xl md:text-3xl" style={{ fontFamily: "var(--font-cinzel), serif" }}>
                  {actorName}
                </p>
                <p
                  className="text-base sm:text-lg md:text-xl mt-2 font-medium italic"
                  style={{
                    background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {movieTitle}
                </p>
              </div>

              {/* ── Variant content ───────────────────────────────────────────── */}
              {variant === "momentum" ? (
                <MomentumContent
                  guestRatingsCount={guestRatingsCount}
                  email={email}
                  setEmail={setEmail}
                  emailError={emailError}
                  emailSent={emailSent}
                  isSendingEmail={isSendingEmail}
                  isGoogleBusy={isGoogleBusy}
                  onGoogleSignIn={handleGoogleSignIn}
                  onMagicLink={handleMagicLink}
                  companyUrl={companyUrl}
                  setCompanyUrl={setCompanyUrl}
                />
              ) : (
                <SingleContent
                  onContinueWithEmail={handleContinueWithEmail}
                  onSignIn={handleSignIn}
                />
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Single variant (original behaviour) ────────────────────────────────────

function SingleContent({
  onContinueWithEmail,
  onSignIn,
}: {
  onContinueWithEmail: () => void
  onSignIn: () => void
}) {
  return (
    <>
      <button
        type="button"
        onClick={onContinueWithEmail}
        className="w-full py-4 px-6 rounded-2xl text-black font-semibold flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden group mb-4 sm:mb-5"
        style={{ background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
      >
        <span>Continue with email</span>
      </button>

      <div className="text-center pt-4 sm:pt-5 border-t border-white/10">
        <p className="text-sm sm:text-base text-gray-400">
          Already have an account?{" "}
          <button
            onClick={onSignIn}
            className="text-[#FFD700] font-semibold hover:underline hover:text-[#FFE55C] transition-colors text-sm sm:text-base"
          >
            Sign In
          </button>
        </p>
      </div>
    </>
  )
}

// ─── Momentum variant ("you're on a roll") ───────────────────────────────────

function MomentumContent({
  guestRatingsCount,
  email,
  setEmail,
  emailError,
  emailSent,
  isSendingEmail,
  isGoogleBusy,
  onGoogleSignIn,
  onMagicLink,
  companyUrl,
  setCompanyUrl,
}: {
  guestRatingsCount: number
  email: string
  setEmail: (v: string) => void
  emailError: string
  emailSent: boolean
  isSendingEmail: boolean
  isGoogleBusy: boolean
  onGoogleSignIn: () => void
  onMagicLink: () => Promise<void>
  companyUrl: string
  setCompanyUrl: (v: string) => void
}) {
  if (emailSent) {
    return (
      <div className="text-center py-4 space-y-2">
        <p className="text-[#FFD700] font-semibold text-lg">Check your inbox</p>
        <p className="text-sm text-[#a1a1aa]">We sent a magic link to <span className="text-white">{email}</span>. Click it to save your ratings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Headline */}
      <div className="text-center space-y-1 mb-1">
        <p className="text-white font-bold text-xl sm:text-2xl">You&apos;re on a roll 🔥</p>
        {guestRatingsCount >= 2 && (
          <p className="text-sm font-semibold" style={{ color: '#FFD700' }}>
            Save your ratings
          </p>
        )}
        <p className="text-sm sm:text-base text-[#a1a1aa]">
          You&apos;ve rated <span className="text-white font-semibold">{guestRatingsCount}</span> performances.
          Save your ratings and build your profile.
        </p>
      </div>

      {/* Google */}
      {googleEnabled && (
        <button
          type="button"
          disabled={isGoogleBusy || isSendingEmail}
          onClick={onGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-full border border-white/15 bg-white/[0.07] text-white text-sm sm:text-base font-semibold tracking-wide hover:border-[#FFD700]/45 hover:bg-[#FFD700]/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGoogleBusy ? <BouncingBallsLoader size="sm" color="#FFD700" /> : <FcGoogle className="w-6 h-6 shrink-0" aria-hidden />}
          {isGoogleBusy ? "Redirecting…" : "Continue with Google"}
        </button>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-[#52525b] font-medium">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Email magic link */}
      <div className="space-y-2 relative">
        <MagicLinkHoneypot value={companyUrl} onChange={setCompanyUrl} />
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value) }}
          onKeyDown={(e) => { if (e.key === "Enter") onMagicLink() }}
          placeholder="your@email.com"
          className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-white placeholder-[#52525b] text-sm focus:outline-none focus:border-[#FFD700]/40 focus:bg-white/[0.09] transition-all"
          autoComplete="email"
        />
        {emailError && <p className="text-xs text-red-400 px-1">{emailError}</p>}
        <button
          type="button"
          disabled={isSendingEmail || isGoogleBusy}
          onClick={onMagicLink}
          className="w-full py-3.5 px-6 rounded-2xl text-black font-semibold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)" }}
        >
          {isSendingEmail ? <BouncingBallsLoader size="sm" color="#000" /> : "Send magic link"}
        </button>
      </div>

      {/* Takes 5 seconds */}
      <p className="text-center text-xs text-[#52525b]">Takes 5 seconds</p>
    </div>
  )
}
