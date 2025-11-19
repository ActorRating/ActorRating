"use client"

export const dynamic = "force-dynamic"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { useUser, useSession } from "@/components/providers/SessionProvider"
import { Button } from "@/components/ui/Button"
import { LoginButton } from "@/components/auth/LoginButton"
import supabase from "@/lib/supabaseClient"
import { validateEmail, validatePassword } from "@/lib/validation"
import { motion } from "framer-motion"
import { fadeInUp, scaleIn } from "@/lib/animations"
import { FaEye, FaEyeSlash, FaPlay, FaUserShield, FaRocket } from "react-icons/fa"
import Link from "next/link"

function SignInContent() {
  const router = useRouter()
  const user = useUser()
  const { session, loading: sessionLoading, isInitialized } = useSession()
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
    const error = searchParams?.get('error')
    if (error === 'OAuthAccountNotLinked') {
      setApiError("An account with this email already exists. Please sign in with your original authentication method.")
    } else if (error === 'pkce') {
      setApiError("Authentication session expired. Please try signing in again.")
    } else if (error) {
      setApiError("Authentication failed. Please try again.")
    }
  }, [searchParams])

  // Remove this useEffect to prevent redirect conflicts with SessionProvider
  // The SessionProvider will handle redirects automatically

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
      // Supabase email/password sign-in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        setApiError(error.message || "Sign in failed")
        return
      }

      if (data.session) {
        // Successfully signed in - refresh the page to ensure session is properly set
        console.log('Email sign-in successful, session:', data.session)
        // Force a page refresh to ensure session cookies are properly set
        window.location.href = '/dashboard'
        return
      }
    } catch (error) {
      console.error("Signin error:", error)
      setApiError("Sign in failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setApiError("") // Clear any existing errors
    
    try {
      console.log('🚀 Starting Google OAuth sign-in...')
      console.log('Redirect URL:', `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) {
        console.error("Google sign in error:", error)
        setApiError(`Google sign in failed: ${error.message}`)
      }
    } catch (error) {
      console.error("Google sign in error:", error)
      setApiError("Google sign in failed. Please try again.")
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

  // Show loading state while form is being submitted
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-4" />
            <div className="absolute inset-0 h-16 w-16 animate-pulse rounded-full bg-primary/10 mx-auto" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Signing you in...</h2>
          <p className="text-sm text-muted-foreground">Please wait while we establish your session.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/3 via-black to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFD700]/5 rounded-full blur-[120px]" />
      
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Elegant Branding */}
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
                Welcome Back
              </h1>
              
              <p className="text-lg text-[#a3a3a3] leading-relaxed font-light">
                Continue rating and analyzing the finest acting performances in cinema.
              </p>
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
            <div className="lg:hidden text-center mb-10">
              <h2 
                className="text-4xl font-bold text-white mb-3"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                Welcome Back
              </h2>
              <p className="text-[#a3a3a3]">Sign in to continue</p>
            </div>

            {/* Sign In Form - Clean & Elegant */}
            <motion.div
              variants={fadeInUp}
              className="relative"
            >
              <div className="relative bg-[#0a0a0a]/80 backdrop-blur-md border border-[#FFD700]/15 rounded-xl p-8 sm:p-10">
                <div className="relative hidden lg:block mb-8">
                  <h2 
                    className="text-2xl font-bold text-white mb-1"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    Sign In
                  </h2>
                  <p className="text-sm text-[#737373]">Enter your credentials</p>
                </div>

                <form onSubmit={handleSubmit} className="relative space-y-4">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      className={`w-full px-4 py-3 bg-black/40 border rounded-lg text-white placeholder-[#737373] focus:outline-none focus:border-[#FFD700]/50 transition-colors duration-200 ${
                        errors.email ? "border-red-500" : "border-[#FFD700]/20"
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
                    <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        required
                        className={`w-full px-4 py-3 pr-12 bg-black/40 border rounded-lg text-white placeholder-[#737373] focus:outline-none focus:border-[#FFD700]/50 transition-colors duration-200 ${
                          errors.password ? "border-red-500" : "border-[#FFD700]/20"
                        }`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#a3a3a3] hover:text-[#FFD700] transition-colors"
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

                {/* Sign Up Link */}
                <div className="relative mt-6 text-center">
                  <p className="text-sm text-[#737373]">
                    Don't have an account?{" "}
                    <Link 
                      href="/auth/signup" 
                      className="text-[#FFD700] hover:text-white font-medium transition-colors"
                    >
                      Sign up
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

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
} 