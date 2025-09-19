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
    const { acceptedTerms } = body

    if (typeof acceptedTerms !== "boolean") {
      return NextResponse.json(
        { error: "Invalid acceptedTerms value" },
        { status: 400 }
      )
    }

    // Update terms acceptance
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        acceptedTerms,
        acceptedAt: acceptedTerms ? new Date() : null,
        termsVersion: acceptedTerms ? "1.0" : null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Terms acceptance update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        acceptedTerms: true, 
        acceptedAt: true, 
        termsVersion: true 
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      acceptedTerms: user.acceptedTerms,
      acceptedAt: user.acceptedAt,
      termsVersion: user.termsVersion
    })
  } catch (error) {
    console.error("Terms acceptance get error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}