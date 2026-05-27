import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Search Actors, Movies & Performances",
  description:
    "Search for actors, movies, and performances. Find ratings, rankings, and detailed performance breakdowns.",
  robots: { index: false, follow: true },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
