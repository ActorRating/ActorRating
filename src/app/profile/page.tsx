"use client"

import { useUser } from "@supabase/auth-helpers-react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { SignedInLayout } from "@/components/layout"
import { Button } from "@/components/ui/Button"
import { motion } from "framer-motion"
import { fadeInUp, getMotionProps } from "@/lib/animations"
import { 
  User, 
  Mail, 
  Shield, 
  Download, 
  Trash2, 
  TriangleAlert,
  LogOut,
  Settings
} from "lucide-react"

export default function ProfilePage() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [profile, setProfile] = useState({ email: "" })
  const [termsData, setTermsData] = useState({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push("/auth/signin")
      return
    }
    loadProfile()
  }, [user, isLoading, router])

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
        await signOut({ redirect: false })
        window.location.href = "/"
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

  if (isLoading) {
    return (
      <SignedInLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </SignedInLayout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SignedInLayout>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 profile-mobile">
          {/* Header */}
          <motion.div 
            variants={fadeInUp}
            {...getMotionProps()}
            className="text-center mb-8 sm:mb-12"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Your Profile
              </span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Manage your account settings and data
            </p>
          </motion.div>

          <div className="space-y-6 sm:space-y-8">
            {/* Profile Card */}
            <motion.div 
              variants={fadeInUp}
              {...getMotionProps()}
              className="relative group safari-blur-fix"
            >
              <div className="relative bg-secondary/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-border/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center">
                      <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                      {profile.email?.split('@')[0] || 'User'}
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base mb-2">
                      {profile.email}
                    </p>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{getAccountType()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action Cards Grid */}
            <motion.div 
              variants={fadeInUp}
              {...getMotionProps()}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
            >
              {/* Download Data Card */}
              <div className="relative group safari-blur-fix">
                <div className="relative bg-secondary/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-border/50 group-hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">Download Data</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">
                    Export all your ratings and profile information
                  </p>
                  <Button 
                    onClick={handleExportData} 
                    variant="outline" 
                    size="lg"
                    className="w-full h-12 group-hover:border-primary/50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Sign Out Card */}
              <div className="relative group safari-blur-fix">
                <div className="relative bg-secondary/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-border/50 group-hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">Sign Out</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">
                    Sign out of your account on this device
                  </p>
                  <Button 
                    onClick={async () => { await supabase.auth.signOut(); window.location.href = "/" }} 
                    variant="outline" 
                    size="lg"
                    className="w-full h-12 group-hover:border-primary/50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Danger Zone */}
            <motion.div 
              variants={fadeInUp}
              {...getMotionProps()}
              className="relative group safari-blur-fix"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-2xl blur opacity-30 safari-safe-transition"></div>
              <div className="relative bg-secondary/40 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-red-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <TriangleAlert className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-red-400">Danger Zone</h3>
                </div>
                
                <p className="text-sm text-muted-foreground mb-6">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>

                {!showDeleteConfirm ? (
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="outline"
                    size="lg"
                    className="text-red-400 border-red-400 hover:bg-red-900/20 hover:border-red-300 h-12"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-900/20 border border-red-900/30 rounded-lg">
                      <h4 className="font-medium text-red-400 mb-2">Confirm Account Deletion</h4>
                      <p className="text-sm text-red-300 mb-4">
                        This will permanently delete your account, all ratings, and profile data. This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700 text-white flex-1 h-12"
                        size="lg"
                      >
                        Yes, Delete My Account
                      </Button>
                      <Button
                        onClick={() => setShowDeleteConfirm(false)}
                        variant="outline"
                        size="lg"
                        className="flex-1 h-12"
                      >
                        Cancel
                      </Button>
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