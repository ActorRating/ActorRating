import { notFound } from "next/navigation"

export default function TestOptimizedLayout({ children }: { children: React.ReactNode }) {
  // Dev-only demo: 404 in production.
  if (process.env.NODE_ENV === "production") notFound()
  return <>{children}</>
}
