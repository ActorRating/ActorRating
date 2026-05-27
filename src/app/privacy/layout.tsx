import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — ActorRating",
  description:
    "Read the ActorRating privacy policy. Learn how we collect, use, and protect your personal data in compliance with GDPR and KVKK.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://actorrating.com/privacy",
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
