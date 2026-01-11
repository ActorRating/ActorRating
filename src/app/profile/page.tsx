"use client"

export const dynamic = "force-dynamic"

import { useUser } from "@/components/providers/SessionProvider"
import { handleLogout } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { SignedInLayout } from "@/components/layout"
import { Button } from "@/components/ui/Button"
import { motion } from "framer-motion"
import { 
  User, 
  Shield, 
  Download, 
  Trash2, 
  TriangleAlert,
  LogOut
} from "lucide-react"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import { UserBadges } from "@/components/dashboard/UserBadges"
import { UserProgressBar } from "@/components/dashboard/UserProgressBar"

export default function ProfilePage() {
  const user = useUser()
  const isLoadingUser = user === undefined
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [profile, setProfile] = useState({ email: "" })
  const [termsData, setTermsData] = useState({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isLoadingUser) return
    if (!user) {
      router.push("/auth/signin")
      return
    }
    loadProfile()
  }, [user, isLoadingUser, router])

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile({
          ...data.user,
          email: user?.email || "",
        })
      }
    } catch (error) {
      console.error("Failed to load profile:", error)
    }
  }

  // terms acceptance removed


  const handleExportData = async () => {
    try {
      const response = await fetch("/api/user/export", { method: "POST" })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `actor-rating-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        throw new Error("Failed to export data")
      }
    } catch (error) {
      console.error("Export error:", error)
      alert("Failed to export data. Please try again.")
    }
  }

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch("/api/user/delete", { method: "DELETE" })
      
      if (response.ok) {
        // Account deleted successfully, sign out and redirect to landing page
        await handleLogout(router)
      } else {
        const errorData = await response.json()
        alert(`Account deletion failed: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Delete account error:", error)
      alert("Account deletion failed. Please try again.")
    }
  }

  const handleTermsAcceptance = async (accepted: boolean) => {
    try {
      const response = await fetch("/api/user/terms-acceptance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ acceptedTerms: accepted }),
      })

      if (response.ok) {
        setTermsData({ ...termsData, acceptedTerms: accepted, acceptedAt: accepted ? new Date() : null })
      } else {
        throw new Error("Failed to update terms acceptance")
      }
    } catch (error) {
      console.error("Terms acceptance error:", error)
      alert("Failed to update terms acceptance. Please try again.")
    }
  }

  const getAccountType = () => "Email Sign-up"
  const isGoogleAccount = () => false

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Not available"
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (isLoadingUser) {
    return (
      <SignedInLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <BouncingBallsLoader 
            size="lg" 
            color="#FFD700"
            showText={true}
            text="Loading profile..."
          />
        </div>
      </SignedInLayout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SignedInLayout>
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 sm:pb-12">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-8 sm:mb-12"
          >
            <h1 
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold mb-3 sm:mb-4"
              style={{ 
                fontFamily: 'var(--font-cinzel), serif',
                textShadow: '0 10px 40px rgba(0,0,0,0.7)',
                letterSpacing: '0.08em',
                lineHeight: '1.1',
              }}
            >
              <span 
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                }}
              >
                Your{' '}
              </span>
              <span className="text-white">
                Profile
              </span>
            </h1>
            
            {/* Gold Divider */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "180px", opacity: 1 }}
              transition={{ duration: 2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-[2px] mx-auto mb-6 sm:mb-8"
            >
              <div 
                className="h-full w-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,229,92,0.4) 15%, rgba(255,215,0,0.9) 40%, rgba(255,215,0,1) 50%, rgba(255,215,0,0.9) 60%, rgba(255,229,92,0.4) 85%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)',
                }}
              />
            </motion.div>

            {/* Progress Bar with Badge */}
            <div className="mb-8">
              <UserProgressBar />
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.9, ease: 'easeOut' }}
              className="text-base sm:text-lg md:text-xl text-[#a3a3a3] font-light max-w-2xl mx-auto"
              style={{ letterSpacing: '0.005em' }}
            >
              Manage your account settings and data
            </motion.p>
          </motion.div>

          <div className="space-y-6 sm:space-y-8">
            {/* Profile Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative group"
            >
              <div 
                className="relative bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 border border-transparent overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.95)]"
                style={{
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                }}
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 relative z-10">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-2xl flex items-center justify-center">
                      <User className="w-10 h-10 sm:w-12 sm:h-12 text-black" />
                    </div>
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0 text-center sm:text-left w-full sm:w-auto">
                    <h2 
                      className="text-2xl sm:text-2xl font-bold text-white mb-2 sm:mb-1"
                      style={{ fontFamily: 'var(--font-cinzel), serif' }}
                    >
                      {profile.email?.split('@')[0] || 'User'}
                    </h2>
                    <p className="text-gray-400 text-base sm:text-base mb-3 sm:mb-2 break-all sm:break-normal">
                      {profile.email}
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Shield className="w-4 h-4 text-[#FFD700]" />
                      <span className="text-sm text-gray-400">{getAccountType()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action Cards Grid */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
            >
              {/* Download Data Card */}
              <div className="relative group">
                <div 
                  className="relative bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-xl p-4 sm:p-6 rounded-[2rem] border border-transparent overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.95)] h-full flex flex-col"
                  style={{
                    boxShadow: `
                      0 25px 70px -15px rgba(0, 0, 0, 0.9),
                      0 15px 40px -10px rgba(0, 0, 0, 0.7),
                      0 0 0 1px rgba(255, 255, 255, 0.05),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                    `,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <div className="w-10 h-10 bg-[#FFD700]/20 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <h3 className="font-semibold text-white">Download Data</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 flex-1 relative z-10">
                    Export all your ratings and profile information
                  </p>
                  <button
                    onClick={handleExportData}
                    className="relative w-full h-12 px-4 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] font-medium transition-all duration-300 flex items-center justify-center gap-2 relative z-10"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>

              {/* Sign Out Card */}
              <div className="relative group">
                <div 
                  className="relative bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-xl p-4 sm:p-6 rounded-[2rem] border border-transparent overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.95)] h-full flex flex-col"
                  style={{
                    boxShadow: `
                      0 25px 70px -15px rgba(0, 0, 0, 0.9),
                      0 15px 40px -10px rgba(0, 0, 0, 0.7),
                      0 0 0 1px rgba(255, 255, 255, 0.05),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                    `,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <div className="w-10 h-10 bg-[#FFD700]/20 rounded-lg flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <h3 className="font-semibold text-white">Sign Out</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 flex-1 relative z-10">
                    Sign out of your account on this device
                  </p>
                  <button
                    onClick={() => handleLogout(router)}
                    className="relative w-full h-12 px-4 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] font-medium transition-all duration-300 flex items-center justify-center gap-2 relative z-10"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Danger Zone */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="relative group"
            >
              <div 
                className="relative bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 border border-transparent overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.95)]"
                style={{
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                }}
              >
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="w-10 h-10 bg-gray-500/20 rounded-lg flex items-center justify-center">
                    <TriangleAlert className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-300">Account Management</h3>
                </div>
                
                <p className="text-sm text-gray-400 mb-6 relative z-10">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>

                {!showDeleteConfirm ? (
                  <div className="flex justify-center sm:justify-start">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="relative px-4 py-3 rounded-full border border-gray-500/30 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 font-medium transition-all duration-300 flex items-center justify-center gap-2 h-12 relative z-10"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 relative z-10">
                    <div className="p-4 bg-gray-500/10 border border-gray-500/30 rounded-[2rem]">
                      <h4 className="font-medium text-white mb-2">Confirm Account Deletion</h4>
                      <p className="text-sm text-gray-400 mb-4">
                        This will permanently delete your account, all ratings, and profile data. This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-full transition-all duration-300 flex-1 h-12 flex items-center justify-center"
                      >
                        Yes, Delete My Account
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-3 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] font-medium transition-all duration-300 flex-1 h-12 flex items-center justify-center"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </SignedInLayout>
  )
} 