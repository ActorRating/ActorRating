import type { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function TestStarScoreLayout({ children }: { children: React.ReactNode }) {
  // Dev-only demo: 404 in production.
  if (process.env.NODE_ENV === "production") notFound()
  return <>{children}</>
}
