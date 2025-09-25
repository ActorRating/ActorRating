"use client"

import React from "react"
import { useUser } from "@supabase/auth-helpers-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { User, Star, Heart, CheckCircle } from "lucide-react"

export default function OnboardingPage() {
  const user = useUser()
  const isLoadingUser = user === undefined
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isNewUser, setIsNewUser] = useState(true)
  const [isCheckingUser, setIsCheckingUser] = useState(true)

  useEffect(() => {
    if (isLoadingUser) return
    if (!user) {
      router.push("/auth/signin")
      return
    }
    checkUserStatus()
  }, [user, isLoadingUser, router])

  const checkUserStatus = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setIsNewUser(true)
      }
    } catch (error) {
      console.error("Failed to check user status:", error)
      // Default to showing welcome cards if we can't determine
      setIsNewUser(true)
    } finally {
      setIsCheckingUser(false)
    }
  }

  const handleCompleteOnboarding = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          onboardingCompleted: true,
        }),
      })

      if (response.ok) {
        router.push("/")
      } else {
        throw new Error("Failed to complete onboarding")
      }
    } catch (error) {
      console.error("Onboarding error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    {
      id: 1,
      title: "Welcome!",
      description: "Welcome to ActorRating. This short guide will introduce you to the platform.",
      icon: User,
    },
    {
      id: 2,
      title: "Rate Performances",
      description: "Rate your favorite actors' performances across 5 different criteria.",
      icon: Star,
    },
    {
      id: 3,
      title: "Join the Community",
      description: "See other users' ratings and join discussions about performances.",
      icon: Heart,
    },
  ]

  if (isLoadingUser || isCheckingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
          {isNewUser ? `Welcome, ${user?.email}!` : `Welcome back, ${user?.email}!`}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {isNewUser ? "Let's start exploring ActorRating" : "Let's get you back to rating performances"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-secondary py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-border">
          {isNewUser ? (
            <>
              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          currentStep >= step.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {currentStep > step.id ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <step.icon className="w-5 h-5" />
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`w-16 h-1 mx-2 ${
                            currentStep > step.id ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Step Content */}
              <div className="text-center mb-8">
                <div className="mb-4">
                  {React.createElement(steps[currentStep - 1].icon, {
                    className: "w-12 h-12 text-primary mx-auto",
                  })}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {steps[currentStep - 1].title}
                </h3>
                <p className="text-muted-foreground">
                  {steps[currentStep - 1].description}
                </p>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                {currentStep > 1 && (
                  <Button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    variant="outline"
                  >
                    Back
                  </Button>
                )}
                
                {currentStep < steps.length ? (
                  <Button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="ml-auto"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleCompleteOnboarding}
                    disabled={isLoading}
                    className="ml-auto"
                  >
                    {isLoading ? "Completing..." : "Get Started!"}
                  </Button>
                )}
              </div>

              {/* Skip Option */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleCompleteOnboarding}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip this step
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Welcome back message for existing users */}
              <div className="text-center mb-8">
                <div className="mb-4">
                  <CheckCircle className="w-12 h-12 text-primary mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Welcome Back!
                </h3>
                <p className="text-muted-foreground">
                  Great to see you again! You're all set to continue rating performances and discovering new talent.
                </p>
              </div>

              {/* Direct completion button for existing users */}
              <div className="text-center">
                <Button
                  onClick={handleCompleteOnboarding}
                  disabled={isLoading}
                  size="lg"
                  className="w-full"
                >
                  {isLoading ? "Completing..." : "Continue to ActorRating"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 