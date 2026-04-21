"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { CheckCircle } from "lucide-react"

export default function VerificationSuccess() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home after 5 seconds
    const timer = setTimeout(() => {
      router.push("/")
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Email Verified Successfully!
          </h1>
          <p className="text-gray-300">
            Your email address has been verified. You now have access to all features.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => router.push("/")}
            className="w-full"
            size="lg"
          >
            Continue to Home
          </Button>
          
          <p className="text-sm text-gray-400">
            You will be redirected automatically in 5 seconds...
          </p>
        </div>
      </div>
    </div>
  )
} 