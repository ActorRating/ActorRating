import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const performance = await prisma.performance.findUnique({
      where: { id },
      select: {
        actor: { select: { name: true } },
        movie: { select: { title: true, year: true } },
      },
    })

    if (!performance) {
      return {
        title: "Performance Not Found",
        description: "The requested acting performance could not be found.",
      }
    }

    const { actor, movie } = performance
    const yearPart = movie.year ? ` (${movie.year})` : ""
    const title = `${actor.name} in ${movie.title}${yearPart}`
    const description = `See how ${actor.name}'s performance in ${movie.title} was rated. Detailed breakdown and user scores.`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    }
  } catch {
    return {
      title: "Acting Performance",
      description: "View acting performance ratings on ActorRating.",
    }
  }
}

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
