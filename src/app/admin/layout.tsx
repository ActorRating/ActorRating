import type { Metadata } from "next"
import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminNav from "@/components/admin/AdminNav"
import { AdminInternalTrafficCookie } from "@/components/admin/AdminInternalTrafficCookie"
import { geistMono } from "@/lib/fonts-mono"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()

  if (!session || !session.user?.email || session.user.email.toLowerCase().trim() !== adminEmail) {
    redirect("/auth/signin")
  }

  return (
    <div className={`${geistMono.variable} min-h-screen bg-background`}>
      <AdminInternalTrafficCookie />
      <Suspense fallback={null}>
        <AdminNav />
      </Suspense>
      {children}
    </div>
  )
}
