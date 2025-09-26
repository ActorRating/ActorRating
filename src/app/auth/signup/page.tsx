"use client"

import { supabase } from "../../../../lib/supabaseClient"
import { useRouter } from "next/navigation"
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
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/dashboard")
    })
  }, [router])

  const handleInputChange = async (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === "email") {
      setEmailTouched(true)
      const valid = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value)
      setErrors(prev => ({ ...prev, email: valid ? "" : "Please enter a valid email address" }))
      // Live MX check after basic format passes
      if (valid) {
        setEmailDomainError("")
        setEmailDomainValid(null)
        try {
          const mxResp = await fetch(`/api/auth/verify-email-domain?email=${encodeURIComponent(value)}`)
          const mxJson = await mxResp.json()
          setEmailDomainValid(mxJson.valid === true)
          if (!mxJson.valid) {
            setEmailDomainError("Email domain is not accepting mail")
          }
        } catch {
          setEmailDomainValid(false)
          setEmailDomainError("Failed to validate email domain")
        }
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
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          setErrors(data.details)
        } else {
          setApiError(data.error || "Failed to create account")
        }
        return
      }

      // Sign in the user after successful signup
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password })
      if (signInError) {
        setApiError("Account created but failed to sign in. Please try signing in manually.")
        return
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
          redirectTo: `${window.location.origin}/auth/callback`
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-primary/5" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary/50 to-secondary/30 backdrop-blur-xl">
          <div className="flex-1 flex flex-col justify-center px-8 xl:px-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-8">
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium border border-accent/20">
                  <FaUserPlus className="w-3 h-3 mr-2" />
                  Join the Community
                </span>
              </div>
              
              <h1 className="text-4xl xl:text-5xl font-bold text-foreground mb-6 leading-tight">
                Start Your Journey with
                <span className="block bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  ActorRating
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Join thousands of film enthusiasts and critics in the world's most sophisticated 
                platform for analyzing and rating acting performances.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-muted-foreground">Rate with professional criteria</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-muted-foreground">Discover hidden gems</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-muted-foreground">Connect with fellow cinephiles</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-muted-foreground">100% free forever</span>
                </div>
              </div>
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
            <div className="lg:hidden text-center mb-8">
              <motion.div variants={fadeInUp} className="mb-4">
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium border border-accent/20">
                  <FaPlay className="w-3 h-3 mr-2" />
                  ActorRating
                </span>
              </motion.div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Join Us Today</h2>
              <p className="text-muted-foreground">Create your account to start rating</p>
            </div>

            {/* Sign Up Form */}
            <motion.div
              variants={fadeInUp}
              className="relative group safari-blur-fix"
            >
              <div className="relative bg-secondary/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8">
                <div className="hidden lg:block mb-6">
                  <h2 className="text-2xl xl:text-3xl font-bold text-foreground mb-2">Create Account</h2>
                  <p className="text-muted-foreground">Start your journey with us today</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
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
                        className={`w-full px-4 py-3 pr-12 bg-background/50 border-2 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                          formData.email.length === 0 && !emailTouched
                            ? "border-border/50 hover:border-border"
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
                    <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
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
                        className={`w-full px-4 py-3 pr-12 bg-background/50 border-2 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                          formData.password.length === 0 && !passwordTouched
                            ? "border-border/50 hover:border-border"
                            : isPasswordValid
                              ? "border-green-500"
                              : "border-red-500"
                        }`}
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
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
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    By creating an account, you agree to our{" "}
                    <Link href="/terms" className="text-primary hover:text-accent transition-colors underline">
                      Terms of Service
                    </Link>
                    ,{" "}
                    <Link href="/privacy" className="text-primary hover:text-accent transition-colors underline">
                      Privacy Policy
                    </Link>
                    {" "}and{" "}
                    <Link href="/kvkk" className="text-primary hover:text-accent transition-colors underline">
                      KVKK Terms
                    </Link>
                    .
                  </p>
                </form>

                {/* Divider */}
                <div className="my-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-secondary/40 px-4 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
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
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link 
                      href="/auth/signin" 
                      className="text-primary hover:text-accent font-medium transition-colors"
                    >
                      Sign in instead
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