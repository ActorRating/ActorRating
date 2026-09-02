export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"

/**
 * Waitlist closed — open registration at /auth/register.
 * Table retained for admin history; no new writes or emails.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "Waitlist is closed. Create a free account instead.",
      registerUrl: "/auth/register",
    },
    { status: 410 },
  )
}
