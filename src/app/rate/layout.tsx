import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Rate Acting Performances",
  description:
    "Rate acting performances scene by scene. Share your opinion and contribute to global actor rankings.",
}

export default function RateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
