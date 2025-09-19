import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { onboardingCompleted } = body

    if (typeof onboardingCompleted !== "boolean") {
      return NextResponse.json(
        { error: "Invalid onboarding status" },
        { status: 400 }
      )
    }

    // Update user's onboarding status
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted,
        acceptedTerms: true, // Mark terms as accepted since they completed onboarding
        kvkkAccepted: true,  // Mark KVKK as accepted since they completed onboarding
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        onboardingCompleted: updatedUser.onboardingCompleted,
      },
    })
  } catch (error) {
    console.error("Onboarding API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 