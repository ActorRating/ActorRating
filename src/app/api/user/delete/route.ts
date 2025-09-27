import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { prisma } from "@/lib/prisma"
// Removed NextAuth imports - using Supabase Auth

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Simple delete function - let database cascades handle the rest
    try {
      await prisma.user.delete({
        where: { id: userId }
      })
    } catch (error: any) {
      // If user doesn't exist (P2025), that means it was already deleted - success!
      if (error.code === 'P2025') {
        return NextResponse.json({
          success: true,
          message: "Account already deleted"
        })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully"
    })
  } catch (error) {
    console.error("Account deletion error:", error)
    
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    )
  }
} 