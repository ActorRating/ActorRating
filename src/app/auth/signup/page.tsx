"use client"

export const dynamic = "force-dynamic"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/providers/SessionProvider"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/Button"
import { motion } from "framer-motion"
import { fadeInUp, fadeIn } from "@/lib/animations"
import { FaEye, FaEyeSlash, FaPlay, FaUserPlus, FaRocket, FaCheck, FaTimes, FaArrowRight } from "react-icons/fa"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import { trackSignUp } from "@/lib/analytics"
// Local validation using requested regex rules

export default function SignUp() {
  const router = useRouter()
  const user = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [emailDomainValid, setEmailDomainValid] = useState<boolean | null>(null)
  const [emailDomainError, setEmailDomainError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const emailValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Popular email service domains
  const POPULAR_EMAIL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
    'protonmail.com', 'aol.com', 'mail.com', 'yandex.com', 'gmx.com',
    'zoho.com', 'live.com', 'msn.com', 'rediffmail.com', 'mail.ru'
  ]

  // Email validation with detailed error messages
  const validateEmailDetailed = (email: string): { isValid: boolean; error?: string } => {
    if (!email) {
      return { isValid: false, error: "Email is required" }
    }

    // Check for basic format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      // Check for common mistakes
      if (email.includes('@') && !email.includes('.')) {
        return { isValid: false, error: "Email must include a domain (e.g., @gmail.com)" }
      }
      if (email.includes('.') && !email.includes('@')) {
        return { isValid: false, error: "Email must include @ symbol" }
      }
      if (email.includes(' ')) {
        return { isValid: false, error: "Email cannot contain spaces" }
      }
      return { isValid: false, error: "Please enter a valid email address" }
    }

    // Extract domain
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) {
      return { isValid: false, error: "Email must include a domain" }
    }

    // Check for popular email services
    const isPopularDomain = POPULAR_EMAIL_DOMAINS.some(popular => 
      domain === popular || domain.endsWith(`.${popular}`)
    )

    if (!isPopularDomain) {
      // Check for common typos in popular domains
      const commonTypos: Record<string, string> = {
        'gmial.com': 'gmail.com',
        'gmaill.com': 'gmail.com',
        'gmai.com': 'gmail.com',
        'yahooo.com': 'yahoo.com',
        'yaho.com': 'yahoo.com',
        'outlok.com': 'outlook.com',
        'outllook.com': 'outlook.com',
        'hotmial.com': 'hotmail.com',
        'hotmai.com': 'hotmail.com',
        'hotmali.com': 'hotmail.com',
      }

      const typoFix = commonTypos[domain]
      if (typoFix) {
        return { isValid: false, error: `Did you mean @${typoFix}?` }
      }

      // Check if it's a valid-looking domain but not popular
      const domainParts = domain.split('.')
      if (domainParts.length >= 2 && domainParts[domainParts.length - 1].length >= 2) {
        // Valid format but not a popular service - allow it but warn
        return { isValid: true } // Allow custom domains
      }

      return { isValid: false, error: "Please use a valid email service (e.g., Gmail, Yahoo, Outlook)" }
    }

    return { isValid: true }
  }

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
      
      // Clear previous timeout
      if (emailValidationTimeoutRef.current) {
        clearTimeout(emailValidationTimeoutRef.current)
      }

      // Clear error immediately while typing
      if (value.length === 0) {
        setErrors(prev => ({ ...prev, email: "" }))
        setEmailDomainValid(null)
        setEmailDomainError("")
      } else {
        // Debounce validation - wait 800ms after user stops typing
        emailValidationTimeoutRef.current = setTimeout(() => {
          const validation = validateEmailDetailed(value)
          if (validation.isValid) {
            setErrors(prev => ({ ...prev, email: "" }))
            setEmailDomainValid(true)
        setEmailDomainError("")
          } else {
            setErrors(prev => ({ ...prev, email: validation.error || "Please enter a valid email address" }))
            setEmailDomainValid(false)
            setEmailDomainError(validation.error || "")
          }
        }, 800)
      }
    } else if (field === "password") {
      setPasswordTouched(true)
      // Updated: 12 chars min, special chars optional
      const valid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(value)
      setErrors(prev => ({ ...prev, password: valid ? "" : "Password does not meet requirements" }))
    }
    setApiError("")
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailValidationTimeoutRef.current) {
        clearTimeout(emailValidationTimeoutRef.current)
      }
    }
  }, [])
  
  // Derived validation state
  const emailValidation = validateEmailDetailed(formData.email)
  const isEmailValid = emailValidation.isValid
  const isEmailDomainOk = emailDomainValid === true
  const hasMinLength = formData.password.length >= 12
  const hasLowercase = /[a-z]/.test(formData.password)
  const hasUppercase = /[A-Z]/.test(formData.password)
  const hasNumber = /\d/.test(formData.password)
  const hasSpecial = /[@$!%*?&]/.test(formData.password)
  const isPasswordValid = hasMinLength && hasLowercase && hasUppercase && hasNumber

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!formData.password) return { score: 0, label: '', color: '' }
    
    let score = 0
    if (hasMinLength) score += 25
    if (hasLowercase) score += 20
    if (hasUppercase) score += 20
    if (hasNumber) score += 20
    if (hasSpecial) score += 15
    
    // Bonus points for length beyond minimum
    if (formData.password.length >= 16) score += 10
    if (formData.password.length >= 20) score += 10
    
    if (score < 40) return { score, label: 'Weak', color: '#ef4444' }
    if (score < 70) return { score, label: 'Fair', color: '#f59e0b' }
    if (score < 90) return { score, label: 'Good', color: '#22c55e' }
    return { score: 100, label: 'Strong', color: '#10b981' }
  }
  
  const passwordStrength = getPasswordStrength()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    
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
      const email = formData.email.trim().toLowerCase()
      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: formData.password }),
      })
      const registerJson = (await registerRes.json().catch(() => ({}))) as {
        error?: string
        fields?: Record<string, string>
      }

      if (!registerRes.ok) {
        const msg =
          registerJson.fields?.email ||
          registerJson.fields?.password ||
          registerJson.error ||
          "Failed to create account"
        setApiError(msg)
        return
      }

      const signInResult = await signIn("credentials", {
        email,
        password: formData.password,
        redirect: false,
      })
      if (signInResult?.error) {
        setApiError("Account created but sign-in failed. Please sign in from the login page.")
        return
      }

      // Track signup success
      trackSignUp('email')

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

      // Redirect to forced first rating
      router.push("/onboarding/rate")
    } catch (error) {
      console.error("Signup error:", error)
      setApiError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BouncingBallsLoader size="md" color="#FFD700" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black lg:bg-gradient-to-br lg:from-black lg:via-black lg:to-[#D4AF37]/15 flex relative overflow-hidden">
      {/* LEFT SIDE - Hero (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative">
        {/* Back button */}
        <Link 
          href="/" 
          className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-[#FFD700] transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
        
        {/* Hero content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 
            className="text-5xl font-bold text-white mb-6 leading-[1.2]" 
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            Join ActorRating
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed">
            Rate and analyze cinema's finest performances
          </p>
        </motion.div>
      </div>
      
      {/* RIGHT SIDE - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-8 relative -mt-4 sm:-mt-6 lg:mt-0">
        <div className="w-full max-w-md">
          
          {/* Mobile: Back button */}
          <div className="lg:hidden mb-6">
            <Link 
              href="/" 
              className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-600/50 text-gray-400 hover:text-[#FFD700] hover:bg-[#FFD700]/10 hover:border-[#FFD700]/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
          
          {/* Mobile: Show logo + title */}
          <motion.div 
            className="lg:hidden text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-4">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <Image
                  src="/logo_navbar.png"
                  alt="ActorRating Logo"
                  width={96}
                  height={96}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 
              className="text-3xl font-bold text-white mb-2" 
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              Join ActorRating
            </h1>
            <p className="text-gray-400 text-sm">
              Rate and analyze cinema's finest performances
            </p>
          </motion.div>


          {/* Card - 3D Elevated Design */}
          <motion.div 
            className="relative p-8 sm:p-10 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              boxShadow: `
                0 25px 70px -15px rgba(0, 0, 0, 0.9),
                0 15px 40px -10px rgba(0, 0, 0, 0.7),
                0 0 0 1px rgba(255, 255, 255, 0.05),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
              `,
              transform: 'translateY(-6px) perspective(1000px) rotateX(1.5deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Title (desktop only, mobile has it above) */}
            <h2 className="hidden lg:block text-2xl font-semibold text-white mb-2 text-center" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
              Create Account
            </h2>
            
            {/* Subtitle (desktop only) */}
            <p className="hidden lg:block text-gray-400 text-center mb-8">
              Sign in to start rating
            </p>
            
            {/* API Error */}
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <p className="text-sm text-red-400 text-center">{apiError}</p>
              </motion.div>
            )}
            
            {/* Legal (simplified) */}
            <p className="text-xs text-gray-500 text-center mt-6 leading-relaxed">
              By continuing, you agree to our{' '}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:underline">
                Terms
              </Link>
              ,{' '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:underline">
                Privacy
              </Link>
              , and{' '}
              <Link href="/kvkk" target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:underline">
                KVKK
              </Link>
            </p>
            
            {/* Sign in link (improved visibility) */}
            <div className="mt-8 pt-6 border-t border-[#FFD700]/10 text-center">
              <p className="text-sm text-gray-400">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-[#FFD700] font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
            
            {/* ============================================
                EMAIL/PASSWORD FORM - COMMENTED OUT
                (Can be restored if needed)
            ============================================ */}
            {/* 
            <div 
              className="relative bg-[rgba(10,10,10,0.85)] backdrop-blur-xl border border-transparent rounded-[2rem] p-5 sm:p-7 lg:p-8 transition-all duration-300" 
              style={{ 
                  backdropFilter: 'blur(24px) saturate(180%)', 
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                  transform: 'translateY(-6px) perspective(1000px) rotateX(1.5deg)',
                  transformStyle: 'preserve-3d',
                }}
            >
              {/* 
                <form onSubmit={handleSubmit} className="relative space-y-4 sm:space-y-5">
                  <div>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => {
                          setEmailTouched(true)
                          setFocusedField(null)
                        }}
                        required
                        className={`floating-input w-full px-5 sm:px-6 pt-5 pb-2 sm:pt-5 sm:pb-2 pr-12 sm:pr-14 bg-black/50 border rounded-xl text-base sm:text-lg text-white outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-[#FFD700]/50 transition-all duration-200 ${
                          formData.email ? 'has-value' : ''
                        } ${
                          !submitted && formData.email.length === 0
                            ? "border-[#2a2a2a] hover:border-[#FFD700]/20"
                            : submitted && (isEmailValid && isEmailDomainOk)
                              ? "border-green-500 focus:border-green-500"
                              : submitted && (!isEmailValid || !isEmailDomainOk)
                              ? "border-red-500 focus:border-red-500"
                              : "border-[#2a2a2a] hover:border-[#FFD700]/20"
                        }`}
                        placeholder=" "
                      />
                      <label
                        htmlFor="email"
                        className={`floating-label absolute left-5 sm:left-6 text-sm sm:text-base pointer-events-none transition-all duration-200 origin-left ${
                          formData.email || focusedField === "email"
                            ? 'floating-label-active'
                            : 'text-[#737373]'
                        }`}
                      >
                        Email Address *
                      </label>
                      {formData.email && submitted && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
                          {(isEmailValid && isEmailDomainOk) ? (
                            <FaCheck className="w-5 h-5 text-green-500" />
                          ) : (
                            <FaTimes className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {(submitted || (emailTouched && formData.email)) && errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400"
                      >
                        {errors.email}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => {
                          setPasswordTouched(true)
                          setFocusedField(null)
                        }}
                        required
                        className={`floating-input w-full px-5 sm:px-6 pt-5 pb-2 sm:pt-5 sm:pb-2 pr-12 sm:pr-14 bg-black/50 border rounded-xl text-base sm:text-lg text-white outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-[#FFD700]/50 transition-all duration-200 ${
                          formData.password ? 'has-value' : ''
                        } ${
                          !submitted && formData.password.length === 0
                            ? "border-[#2a2a2a] hover:border-[#FFD700]/20"
                            : submitted && isPasswordValid
                              ? "border-green-500 focus:border-green-500"
                              : submitted && !isPasswordValid
                              ? "border-red-500 focus:border-red-500"
                              : "border-[#2a2a2a] hover:border-[#FFD700]/20"
                        }`}
                        placeholder=" "
                      />
                      <label
                        htmlFor="password"
                        className={`floating-label absolute left-5 sm:left-6 text-sm sm:text-base pointer-events-none transition-all duration-200 origin-left ${
                          formData.password || focusedField === "password"
                            ? 'floating-label-active'
                            : 'text-[#737373]'
                        }`}
                      >
                        Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#a3a3a3] hover:text-[#FFD700] transition-colors z-10"
                      >
                        {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    {formData.password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 space-y-2"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Password strength</span>
                            <span 
                              className="text-xs font-medium"
                              style={{ color: passwordStrength.color }}
                            >
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${passwordStrength.score}%` }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                              className="h-full rounded-full transition-all duration-300"
                              style={{ 
                                backgroundColor: passwordStrength.color,
                                boxShadow: `0 0 10px ${passwordStrength.color}40`
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${hasMinLength ? "text-green-400" : "text-gray-500"}`}>
                            {hasMinLength ? <FaCheck className="w-3.5 h-3.5" /> : <FaTimes className="w-3.5 h-3.5" />}
                            <span>12+ characters</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${hasLowercase ? "text-green-400" : "text-gray-500"}`}>
                            {hasLowercase ? <FaCheck className="w-3.5 h-3.5" /> : <FaTimes className="w-3.5 h-3.5" />}
                            <span>Lowercase</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${hasUppercase ? "text-green-400" : "text-gray-500"}`}>
                            {hasUppercase ? <FaCheck className="w-3.5 h-3.5" /> : <FaTimes className="w-3.5 h-3.5" />}
                            <span>Uppercase</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${hasNumber ? "text-green-400" : "text-gray-500"}`}>
                            {hasNumber ? <FaCheck className="w-3.5 h-3.5" /> : <FaTimes className="w-3.5 h-3.5" />}
                            <span>Number</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {apiError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
                    >
                      <p className="text-sm text-red-400">{apiError}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !isEmailValid || !isPasswordValid || !isEmailDomainOk}
                    className="w-full group px-8 py-4 rounded-full text-black text-lg font-bold tracking-wider transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                      transform: 'scale(1)',
                      boxShadow: '0 0 20px rgba(255, 215, 0, 0.25), 0 0 40px rgba(255, 215, 0, 0.15)',
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.transform = 'scale(1.03)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-3">
                        <BouncingBallsLoader size="sm" color="#000000" className="mb-0" />
                        Creating Account...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-3 group">
                        Create Account
                        <FaArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    )}
                  </button>

                  <p className="text-xs text-[#737373] text-center leading-relaxed mt-2">
                    By creating an account, you agree to our{" "}
                    <Link 
                      href="/terms" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFD700] hover:text-[#FFE55C] underline transition-colors"
                    >
                      Terms of Service
                    </Link>
                    ,{" "}
                    <Link 
                      href="/privacy" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFD700] hover:text-[#FFE55C] underline transition-colors"
                    >
                      Privacy Policy
                    </Link>
                    {" "}and{" "}
                    <Link 
                      href="/kvkk" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFD700] hover:text-[#FFE55C] underline transition-colors"
                    >
                      KVKK Terms
                    </Link>
                    .
                  </p>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#FFD700]/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#0a0a0a] px-3 text-[#737373] uppercase tracking-wider">
                      Or
                    </span>
                  </div>
                </div>
                */}
          </motion.div>
        </div>
      </div>
    </div>
  )
} 