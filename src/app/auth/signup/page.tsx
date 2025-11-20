"use client"

export const dynamic = "force-dynamic"

import supabase from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/providers/SessionProvider"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { LoginButton } from "@/components/auth/LoginButton"
import { motion } from "framer-motion"
import { fadeInUp, scaleIn } from "@/lib/animations"
import { FaEye, FaEyeSlash, FaPlay, FaUserPlus, FaRocket, FaCheck, FaTimes } from "react-icons/fa"
import Link from "next/link"
// Local validation using requested regex rules

export default function SignUp() {
  const router = useRouter()
  const user = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [emailDomainValid, setEmailDomainValid] = useState<boolean | null>(null)
  const [emailDomainError, setEmailDomainError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handleInputChange = async (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === "email") {
      setEmailTouched(true)
      const valid = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value)
      setErrors(prev => ({ ...prev, email: valid ? "" : "Please enter a valid email address" }))
      // Skip domain validation for now - Supabase will handle email validation
      if (valid) {
        setEmailDomainValid(true)
        setEmailDomainError("")
      } else {
        setEmailDomainValid(null)
        setEmailDomainError("")
      }
    } else if (field === "password") {
      setPasswordTouched(true)
      const valid = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value)
      setErrors(prev => ({ ...prev, password: valid ? "" : "Password does not meet requirements" }))
    }
    setApiError("")
  }
  
  // Derived validation state
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(formData.email)
  const isEmailDomainOk = emailDomainValid === true
  const hasMinLength = formData.password.length >= 8
  const hasUppercase = /[A-Z]/.test(formData.password)
  const hasNumber = /\d/.test(formData.password)
  const hasSpecial = /[@$!%*?&]/.test(formData.password)
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form data (using local rules)
    const newErrors: Record<string, string> = {}
    if (!isEmailValid) newErrors.email = "Please enter a valid email address"
    if (!isPasswordValid) newErrors.password = "Password does not meet requirements"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setApiError("")

    try {
      // Direct Supabase signup
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        setApiError(error.message || "Failed to create account")
        return
      }

      if (!data.user) {
        setApiError("Account creation failed. Please try again.")
        return
      }

      // Immediately sign in after successful signup
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        console.error("Auto sign-in failed:", signInError)
        // Continue to onboarding even if auto sign-in fails
      }

      // Check if there's a pending rating to submit
      const pendingRating = localStorage.getItem('pendingRating')
      if (pendingRating) {
        try {
          const ratingData = JSON.parse(pendingRating)
          
          // Submit the pending rating
          const ratingResponse = await fetch('/api/ratings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              actorId: ratingData.actorId,
              movieId: ratingData.movieId,
              emotionalRangeDepth: ratingData.emotionalRangeDepth,
              characterBelievability: ratingData.characterBelievability,
              technicalSkill: ratingData.technicalSkill,
              screenPresence: ratingData.screenPresence,
              chemistryInteraction: ratingData.chemistryInteraction,
              comment: ratingData.comment,
              recaptchaToken: 'bypass' // Skip reCAPTCHA for post-signup submission
            }),
          })

          if (ratingResponse.ok) {
            // Clear the pending rating
            localStorage.removeItem('pendingRating')
            
            // Redirect to the rating success page
            const successUrl = `/rating-success?actorName=${encodeURIComponent(ratingData.actorName)}&movieTitle=${encodeURIComponent(ratingData.movieTitle)}&movieYear=${ratingData.movieYear}&emotionalRangeDepth=${ratingData.emotionalRangeDepth}&characterBelievability=${ratingData.characterBelievability}&technicalSkill=${ratingData.technicalSkill}&screenPresence=${ratingData.screenPresence}&chemistryInteraction=${ratingData.chemistryInteraction}${ratingData.comment ? `&comment=${encodeURIComponent(ratingData.comment)}` : ''}`
            router.push(successUrl)
            return
          }
        } catch (error) {
          console.error('Failed to submit pending rating:', error)
          // Continue to onboarding even if rating submission fails
        }
      }

      // Redirect to onboarding or home
      router.push("/onboarding")
    } catch (error) {
      console.error("Signup error:", error)
      setApiError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
        }
      })
      if (error) console.error(error)
    } catch (error) {
      console.error("Google sign in error:", error)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/3 via-black to-transparent" />
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFD700]/5 rounded-full blur-[120px]" />
      
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2">
          <div className="flex-1 flex flex-col justify-center px-12 xl:px-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 
                className="text-5xl xl:text-6xl font-bold text-white mb-4 leading-tight"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                Join ActorRating
              </h1>
              
              <p className="text-lg text-[#a3a3a3] leading-relaxed font-light">
                Start rating and analyzing the finest acting performances in cinema.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className="flex-1 lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-16">
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="show"
            className="w-full max-w-md mx-auto"
          >
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8 px-4">
              <h2 
                className="text-3xl sm:text-4xl font-bold text-white mb-2"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                Create Account
              </h2>
              <p className="text-sm text-[#737373]">Join the platform</p>
            </div>

            {/* Sign Up Form */}
            <motion.div
              variants={fadeInUp}
              className="relative group safari-blur-fix"
            >
              {/* Golden Spotlights - Opposing Diagonal Corners */}
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-radial from-[#FFD700]/30 via-[#FFA500]/15 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-radial from-[#FFD700]/30 via-[#FFA500]/15 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
              
              {/* Glassmorphism Container */}
              <div className="relative bg-black/40 backdrop-blur-2xl border border-[#FFD700]/20 rounded-xl p-8 sm:p-10 md:p-12 lg:p-14 shadow-[0_8px_32px_0_rgba(255,215,0,0.15)]" style={{ backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}>
                <div className="relative hidden lg:block mb-8">
                  <h2 
                    className="text-xl md:text-2xl font-bold text-white mb-1"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    Create Account
                  </h2>
                  <p className="text-xs md:text-sm text-[#737373]">Join the platform</p>
                </div>

                <form onSubmit={handleSubmit} className="relative space-y-5 sm:space-y-6">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-[#e4e4e7] mb-2 sm:mb-2.5">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        required
                        className={`w-full px-4 sm:px-5 py-3 sm:py-3.5 pr-12 sm:pr-14 bg-black/50 border rounded-lg text-sm sm:text-base text-white placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/30 transition-all duration-200 ${
                          formData.email.length === 0 && !emailTouched
                            ? "border-[#2a2a2a] hover:border-[#FFD700]/20"
                            : (isEmailValid && isEmailDomainOk)
                              ? "border-green-500"
                              : "border-red-500"
                        }`}
                        placeholder="your@email.com"
                      />
                      {formData.email && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {(isEmailValid && isEmailDomainOk) ? (
                            <FaCheck className="w-5 h-5 text-green-500" />
                          ) : emailTouched && formData.email ? (
                            <FaTimes className="w-5 h-5 text-red-500" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    {emailTouched && (!isEmailValid || (isEmailValid && emailDomainValid === false)) && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400"
                      >
                        {!isEmailValid ? "Please enter a valid email address" : (emailDomainError || "Email domain is not accepting mail")}
                      </motion.p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-[#e4e4e7] mb-2 sm:mb-2.5">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        onBlur={() => setPasswordTouched(true)}
                        required
                        className={`w-full px-4 sm:px-5 py-3 sm:py-3.5 pr-12 sm:pr-14 bg-black/50 border rounded-lg text-sm sm:text-base text-white placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/30 transition-all duration-200 ${
                          formData.password.length === 0 && !passwordTouched
                            ? "border-[#2a2a2a] hover:border-[#FFD700]/20"
                            : isPasswordValid
                              ? "border-green-500"
                              : "border-red-500"
                        }`}
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#a3a3a3] hover:text-[#FFD700] transition-colors"
                      >
                        {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    {/* Password Requirements */}
                    {formData.password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 space-y-2"
                      >
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className={`flex items-center space-x-2 ${hasMinLength ? "text-green-400" : "text-red-400"}`}>
                            {hasMinLength ? <FaCheck className="w-3 h-3" /> : <FaTimes className="w-3 h-3" />}
                            <span>8+ characters</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${hasUppercase ? "text-green-400" : "text-red-400"}`}>
                            {hasUppercase ? <FaCheck className="w-3 h-3" /> : <FaTimes className="w-3 h-3" />}
                            <span>Uppercase</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${hasNumber ? "text-green-400" : "text-red-400"}`}>
                            {hasNumber ? <FaCheck className="w-3 h-3" /> : <FaTimes className="w-3 h-3" />}
                            <span>Number</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${hasSpecial ? "text-green-400" : "text-red-400"}`}>
                            {hasSpecial ? <FaCheck className="w-3 h-3" /> : <FaTimes className="w-3 h-3" />}
                            <span>Special char</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* API Error */}
                  {apiError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
                    >
                      <p className="text-sm text-red-400">{apiError}</p>
                    </motion.div>
                  )}

                  {/* Sign Up Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !isEmailValid || !isPasswordValid || !isEmailDomainOk}
                    variant="premium"
                    size="lg"
                    className="w-full group"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating Account...
                      </div>
                    ) : (
                      <>
                        <FaRocket className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                        Create Account
                      </>
                    )}
                  </Button>

                  {/* Terms */}
                  <p className="text-xs text-[#737373] text-center leading-relaxed">
                    By creating an account, you agree to our{" "}
                    <Link href="/terms" className="text-[#FFD700] hover:text-white transition-colors underline">
                      Terms of Service
                    </Link>
                    ,{" "}
                    <Link href="/privacy" className="text-[#FFD700] hover:text-white transition-colors underline">
                      Privacy Policy
                    </Link>
                    {" "}and{" "}
                    <Link href="/kvkk" className="text-[#FFD700] hover:text-white transition-colors underline">
                      KVKK Terms
                    </Link>
                    .
                  </p>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#FFD700]/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#0a0a0a] px-3 text-[#737373] uppercase tracking-wider">
                      Or
                    </span>
                  </div>
                </div>

                {/* Google Sign Up */}
                <LoginButton
                  onClick={handleGoogleSignUp}
                  disabled={isGoogleLoading}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  {isGoogleLoading ? "Creating account..." : "Continue with Google"}
                </LoginButton>

                {/* Sign In Link */}
                <div className="relative mt-6 text-center">
                  <p className="text-sm text-[#737373]">
                    Already have an account?{" "}
                    <Link 
                      href="/auth/signin" 
                      className="text-[#FFD700] hover:text-white font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
} 