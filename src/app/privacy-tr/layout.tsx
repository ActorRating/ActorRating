import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "ActorRating gizlilik politikasını okuyun.",
  robots: { index: false, follow: true },
}

export default function PrivacyTrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
