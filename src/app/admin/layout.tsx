import { auth } from "@/auth"
import { redirect } from "next/navigation"

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

  return <>{children}</>
}