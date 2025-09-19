"use client"

import { useSession, signOut } from "next-auth/react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { SignedInLayout } from "@/components/layout"
import { Button } from "@/components/ui/Button"
import { 
  User, 
  Mail, 
  Shield, 
  Download, 
  Trash2, 
  TriangleAlert
} from "lucide-react"

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [profile, setProfile] = useState({ email: "" })
  const [termsData, setTermsData] = useState({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (status === "loading") return
    
    if (!session) {
      router.push("/auth/signin")
      return
    }

    // Load user profile data
    loadProfile()
    // terms acceptance removed
  }, [session, status, router])

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile({
          ...data.user,
          email: session?.user?.email || "",
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

  if (status === "loading") {
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

  if (!session) {
    return null
  }

  return (
    <SignedInLayout>
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>

          <div className="space-y-8">
            {/* Basic Information */}
            <section className="bg-secondary rounded-lg border border-border p-4 sm:p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Basic Information
                </h2>
              </div>


              <div className="grid grid-cols-1 gap-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email Address
                  </label>
                  <p className="text-foreground">{profile.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Account Type
                  </label>
                  <p className="text-foreground">{getAccountType()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How you signed up for this account
                  </p>
                </div>
              </div>
            </section>


            {/* Data & Privacy */}
            <section className="bg-secondary rounded-lg border border-border p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center">
                <Download className="w-5 h-5 mr-2" />
                Data & Privacy
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Download Your Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Get a copy of all your data including ratings and profile information
                    </p>
                  </div>
                  <Button noMotion onClick={handleExportData} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Data
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                      <h3 className="font-medium text-foreground flex items-center">
                      <TriangleAlert className="w-4 h-4 mr-2 text-red-400" />
                      Delete Account
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button
                    noMotion
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>

                {showDeleteConfirm && (
                  <div className="p-4 bg-red-900/20 border border-red-900/30 rounded-lg">
                    <h4 className="font-medium text-red-400 mb-2">Confirm Account Deletion</h4>
                    <p className="text-sm text-red-300 mb-4">
                      This action cannot be undone. All your ratings, profile data, and account information will be permanently deleted.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        noMotion
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        size="sm"
                      >
                        Yes, Delete My Account
                      </Button>
                      <Button
                        noMotion
                        onClick={() => setShowDeleteConfirm(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                        
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Legal Compliance removed for simplification */}
          </div>
        </div>
      </div>
    </SignedInLayout>
  )
} 