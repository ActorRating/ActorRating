import type { Metadata } from "next"
import { geistMono } from "@/lib/fonts-mono"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Rate Acting Performances",
  description:
    "Rate acting performances with a quick score or five criteria. Share your take and contribute to community rankings.",
}

export default function RateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={geistMono.variable}>{children}</div>
}
