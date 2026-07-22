"use client"

import { useSession } from "@/components/providers/SessionProvider"
import { handleLogout } from "@/lib/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
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

type ProfileClientProps = {
  initialProfile?: { email?: string; username?: string | null } | null
}

export default function ProfileClient({ initialProfile = null }: ProfileClientProps) {
  const { user, status } = useSession()
  const isLoadingUser = status === "loading"
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(initialProfile == null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [profile, setProfile] = useState({
    email: initialProfile?.email ?? "",
    username: initialProfile?.username ?? null,
  })
  const [termsData, setTermsData] = useState({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Wait until the session has fully resolved before acting on it.
    // Never redirect from here — the server component already guards auth,
    // and middleware will intercept any future unauthenticated navigation.
    if (isLoadingUser) return
    if (!user) return
    if (initialProfile != null) return
    loadProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoadingUser, initialProfile])

  const loadProfile = async () => {
    try {
      setIsLoadingProfile(true)
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
    } finally {
      setIsLoadingProfile(false)
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

  if (isLoadingUser || isLoadingProfile) {
    return (
      <SignedInLayout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <BouncingBallsLoader 
            size="lg" 
            color="#FFD700"
            showText={true}
            text={isLoadingUser ? "Loading profile..." : "Loading data..."}
          />
        </div>
      </SignedInLayout>
    )
  }

  // Middleware guards /profile — this branch should never be reached in normal
  // flow. Show a minimal sign-in prompt instead of an invisible blank page.
  if (status === "unauthenticated") {
    return (
      <SignedInLayout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <a href="/auth/signin" className="text-sm text-gray-400 hover:text-white transition-colors">
            Session expired — sign in again
          </a>
        </div>
      </SignedInLayout>
    )
  }

  return (
    <SignedInLayout>
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-[6.5rem] sm:pt-[7.5rem] pb-16 sm:pb-20">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FFD700]/70 mb-3">
              Account
            </p>
            <h1
              className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white tracking-tight leading-[1.15] mb-3"
              style={{
                fontFamily:
                  'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
              }}
            >
              Your profile
            </h1>
            <p className="text-[15px] sm:text-base text-zinc-500 leading-relaxed max-w-xl mx-auto mb-8">
              Manage your account settings and data.
            </p>

            <div className="mb-8">
              <UserProgressBar />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/discover" className="text-sm text-gray-400 hover:text-[#FFD700] transition-colors">
                Discover
              </Link>
              <Link href="/search" className="text-sm text-gray-400 hover:text-[#FFD700] transition-colors">
                Search Actors & Movies
              </Link>
              <Link href="/rate" className="text-sm text-gray-400 hover:text-[#FFD700] transition-colors">
                Rate a Performance
              </Link>
              {profile.username ? (
                <Link href={`/u/${profile.username}`} className="text-sm text-gray-400 hover:text-[#FFD700] transition-colors">
                  View Public Profile
                </Link>
              ) : null}
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Profile Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative group"
            >
              <div 
                className="relative bg-[#141414] rounded-md p-5 sm:p-6 border border-white/[0.08] overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 relative z-10">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-md flex items-center justify-center">
                      <User className="w-10 h-10 sm:w-12 sm:h-12 text-black" />
                    </div>
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0 text-center sm:text-left w-full sm:w-auto">
                    <h2
                      className="text-2xl font-bold text-white mb-2 sm:mb-1 tracking-tight"
                      style={{
                        fontFamily:
                          'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
                      }}
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
                  className="relative bg-[#141414] p-4 sm:p-5 rounded-md border border-white/[0.08] overflow-hidden h-full flex flex-col"
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
                    className="relative w-full h-12 px-4 rounded-md border border-[#FFD700]/30 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] font-medium transition-colors duration-200 flex items-center justify-center gap-2 relative z-10"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>

              {/* Sign Out Card */}
              <div className="relative group">
                <div 
                  className="relative bg-[#141414] p-4 sm:p-5 rounded-md border border-white/[0.08] overflow-hidden h-full flex flex-col"
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
                    className="relative w-full h-12 px-4 rounded-md border border-[#FFD700]/30 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] font-medium transition-colors duration-200 flex items-center justify-center gap-2 relative z-10"
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
                className="relative bg-[#141414] rounded-md p-5 sm:p-6 border border-white/[0.08] overflow-hidden"
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
                      className="relative px-4 py-3 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 font-medium transition-colors duration-200 flex items-center justify-center gap-2 h-12 relative z-10"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 relative z-10">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-md">
                      <h4 className="font-medium text-white mb-2">Confirm Account Deletion</h4>
                      <p className="text-sm text-gray-400 mb-4">
                        This will permanently delete your account, all ratings, and profile data. This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-md transition-colors duration-200 flex-1 h-12 flex items-center justify-center"
                      >
                        Yes, Delete My Account
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-3 rounded-md border border-[#FFD700]/30 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] font-medium transition-colors duration-200 flex-1 h-12 flex items-center justify-center"
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