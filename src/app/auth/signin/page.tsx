"use client"

import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { LoginButton } from "@/components/auth/LoginButton"
import { validateEmail, validatePassword } from "@/lib/validation"
import { motion } from "framer-motion"
import { fadeInUp, scaleIn } from "@/lib/animations"
import { FaEye, FaEyeSlash, FaPlay, FaUserShield, FaRocket } from "react-icons/fa"
import Link from "next/link"

export default function SignIn() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState("")
  const [infoMessage, setInfoMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle messages/errors from URL params
  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'OAuthAccountNotLinked') {
      setApiError("An account with this email already exists. Please sign in with your original authentication method.")
    } else if (error) {
      setApiError("Authentication failed. Please try again.")
    }
  }, [searchParams])

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push("/")
      }
    })
  }, [router])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
    setApiError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form data
    const emailValidation = validateEmail(formData.email)
    const passwordValidation = validatePassword(formData.password)
    
    const newErrors: Record<string, string> = {}
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error!
    }
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error!
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setApiError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

        const data = await response.json()

        if (!response.ok) {
          setApiError(data.error || "Sign in failed")
          return
        }

        // Use NextAuth for session management
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (result?.error) {
          setApiError("Invalid email or password")
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
                recaptchaToken: 'bypass' // Skip reCAPTCHA for post-signin submission
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
      console.error("Signin error:", error)
      setApiError("Sign in failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      // Check if there's a pending rating to handle after Google signin
      const pendingRating = localStorage.getItem('pendingRating')
      const callbackUrl = pendingRating ? '/auth/signin-success' : '/onboarding'
      
      await signIn("google", { callbackUrl })
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
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
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
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                  <FaUserShield className="w-3 h-3 mr-2" />
                  Secure Authentication
                </span>
              </div>
              
              <h1 className="text-4xl xl:text-5xl font-bold text-foreground mb-6 leading-tight">
                Welcome Back to
                <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  ActorRating
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Continue your journey in the world's most sophisticated platform for 
                rating and analyzing acting performances.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-muted-foreground">5 Oscar-inspired rating criteria</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-muted-foreground">Community-driven insights</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-muted-foreground">Professional-grade analysis</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Sign In Form */}
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
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                  <FaPlay className="w-3 h-3 mr-2" />
                  ActorRating
                </span>
              </motion.div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h2>
              <p className="text-muted-foreground">Sign in to continue rating performances</p>
            </div>

            {/* Sign In Form */}
            <motion.div
              variants={fadeInUp}
              className="relative group safari-blur-fix"
            >
              <div className="relative bg-secondary/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8">
                <div className="hidden lg:block mb-6">
                  <h2 className="text-2xl xl:text-3xl font-bold text-foreground mb-2">Sign In</h2>
                  <p className="text-muted-foreground">Access your account to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      className={`w-full px-4 py-3 bg-background/50 border-2 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                        errors.email ? "border-red-500" : "border-border/50 hover:border-border"
                      }`}
                      placeholder="your@email.com"
                    />
                    {errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400"
                      >
                        {errors.email}
                      </motion.p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        required
                        className={`w-full px-4 py-3 pr-12 bg-background/50 border-2 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                          errors.password ? "border-red-500" : "border-border/50 hover:border-border"
                        }`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400"
                      >
                        {errors.password}
                      </motion.p>
                    )}
                  </div>

                  {/* Messages */}
                  {infoMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                    >
                      <p className="text-sm text-emerald-300">{infoMessage}</p>
                    </motion.div>
                  )}
                  
                  {apiError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                    >
                      <p className="text-sm text-red-400">{apiError}</p>
                    </motion.div>
                  )}

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    variant="premium"
                    size="lg"
                    className="w-full group"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                        Signing In...
                      </div>
                    ) : (
                      <>
                        <FaRocket className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                        Sign In
                      </>
                    )}
                  </Button>
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

                {/* Google Sign In */}
                <LoginButton
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  {isGoogleLoading ? "Signing in..." : "Continue with Google"}
                </LoginButton>

                {/* Guest Access */}
                <div className="mt-6">
                  <Button
                    onClick={() => router.push("/")}
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    Continue as Guest
                  </Button>
                </div>

                {/* Sign Up Link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link 
                      href="/auth/signup" 
                      className="text-primary hover:text-accent font-medium transition-colors"
                    >
                      Create one now
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