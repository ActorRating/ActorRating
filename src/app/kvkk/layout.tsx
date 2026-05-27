import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni — ActorRating",
  description:
    "ActorRating KVKK kişisel verilerin korunması kanunu kapsamında aydınlatma metni.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://actorrating.com/kvkk",
  },
}

export default function KvkkLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
