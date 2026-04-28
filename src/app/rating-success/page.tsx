import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function RatingSuccessPage() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return null
  }

  const ratingCount = await prisma.rating.count({
    where: { userId },
  })

  if (ratingCount >= 1) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <h1 className="text-2xl font-bold text-white">Rating submitted</h1>
        <div className="mt-4">
          <Link href="/dashboard" className="text-sm text-[#FFD700] hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
