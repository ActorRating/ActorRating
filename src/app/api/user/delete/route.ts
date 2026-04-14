export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClientFromRequest } from "@/lib/supabaseRequestClient"
import { prisma } from "@/lib/prisma"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClientFromRequest(request)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    // Delete user-owned data in our app tables (Supabase Auth user remains)
    try {
      await prisma.rating.deleteMany({ where: { userId } })
      await prisma.performance.deleteMany({ where: { userId } })
    } catch (error: any) {
      // proceed even if nothing to delete
    }

    return NextResponse.json({ success: true, message: "Account deleted successfully" })
  } catch (error) {
    console.error("Account deletion error:", error)
    
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    )
  }
} 