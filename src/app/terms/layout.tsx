import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service — ActorRating",
  description:
    "Read the ActorRating terms of service. Understand the rules and guidelines for using our acting performance rating platform.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://actorrating.com/terms",
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
