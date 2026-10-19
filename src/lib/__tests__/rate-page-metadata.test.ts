jest.mock("@/lib/prisma", () => ({
  prisma: {
    movie: { findFirst: jest.fn() },
    actor: { findFirst: jest.fn() },
    rating: { count: jest.fn(), aggregate: jest.fn() },
    performance: { findMany: jest.fn() },
    performanceEditorial: { findUnique: jest.fn() },
  },
}))

import { prisma } from "@/lib/prisma"
import {
  buildRatePageMetadata,
  generateRatePageMetadata,
  type RatePageMetadataSource,
} from "@/lib/rate-page-metadata"

const prismaMock = prisma as unknown as {
  movie: { findFirst: jest.Mock }
  actor: { findFirst: jest.Mock }
  rating: { count: jest.Mock }
  performance: { findMany: jest.Mock }
  performanceEditorial: { findUnique: jest.Mock }
}

const movie = {
  id: "movie-1",
  title: "The Godfather",
  year: 1972,
  slug: "the-godfather-1972",
  posterUrl: null,
  indexingCohort: 1,
}

const actor = {
  id: "actor-1",
  name: "Marlon Brando",
  slug: "marlon-brando",
  imageUrl: null,
}

const leadPerformance = {
  tier: "LEAD",
  seededAggregateScore: 9.2,
  character: "Vito Corleone",
  userId: "uuid-from-auth-users",
  order: 0,
  createdAt: new Date("1972-03-24T00:00:00.000Z"),
}

function source(overrides: Partial<RatePageMetadataSource> = {}): RatePageMetadataSource {
  return {
    actor,
    movie,
    communityRatingCount: 4,
    tier: "LEAD",
    seededAggregateScore: 9.2,
    editorialOverview: null,
    editorialWordCount: 0,
    editorialPublished: false,
    ...overrides,
  }
}

function mockResolvablePair(ratingCount = 4, tier = "LEAD") {
  prismaMock.movie.findFirst.mockImplementation(async ({ where }: { where: { slug?: string; id?: string } }) => {
    if (where.slug === "the-godfather-1972" || where.id === "movie-1") return movie
    return null
  })
  prismaMock.actor.findFirst.mockImplementation(async ({ where }: { where: { slug?: string; id?: string } }) => {
    if (where.slug === "marlon-brando" || where.id === "actor-1") return actor
    return null
  })
  prismaMock.rating.count.mockResolvedValue(ratingCount)
  prismaMock.performance.findMany.mockResolvedValue([{ ...leadPerformance, tier }])
  prismaMock.performanceEditorial.findUnique.mockResolvedValue(null)
}

describe("rate page metadata", () => {
  const originalBase = process.env.NEXT_PUBLIC_BASE_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://actorrating.com"
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("public API unavailable"))
    prismaMock.movie.findFirst.mockReset()
    prismaMock.actor.findFirst.mockReset()
    prismaMock.rating.count.mockReset()
    prismaMock.performance.findMany.mockReset()
    prismaMock.performanceEditorial.findUnique.mockReset()
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = originalBase
    jest.restoreAllMocks()
  })

  it("builds an indexable canonical page for an eligible performance", async () => {
    const metadata = buildRatePageMetadata(source())

    expect(metadata.title).toBe("Rate Marlon Brando in The Godfather (1972)")
    expect(metadata.description).toContain("Marlon Brando")
    expect(metadata.robots).toBeUndefined()
    expect(metadata.alternates).toEqual({
      canonical: "https://actorrating.com/rate/the-godfather-1972/marlon-brando",
    })
    expect(metadata.openGraph).toMatchObject({
      url: "https://actorrating.com/rate/the-godfather-1972/marlon-brando",
    })
  })

  it("keeps a valid performance indexable when the public API fails and Prisma succeeds", async () => {
    mockResolvablePair()

    const metadata = await generateRatePageMetadata("the-godfather-1972", "marlon-brando")

    expect(global.fetch).not.toHaveBeenCalled()
    expect(metadata.title).toBe("Rate Marlon Brando in The Godfather (1972)")
    expect(metadata.robots).toBeUndefined()
    expect(metadata.alternates).toEqual({
      canonical: "https://actorrating.com/rate/the-godfather-1972/marlon-brando",
    })
  })

  it("uses the slug canonical when the request used database ids", async () => {
    mockResolvablePair()

    const metadata = await generateRatePageMetadata("movie-1", "actor-1")

    expect(metadata.alternates).toEqual({
      canonical: "https://actorrating.com/rate/the-godfather-1972/marlon-brando",
    })
    expect(metadata.robots).toBeUndefined()
  })

  it("marks a missing actor or movie as not found and noindex", async () => {
    prismaMock.movie.findFirst.mockResolvedValue(null)
    prismaMock.actor.findFirst.mockResolvedValue(null)

    const metadata = await generateRatePageMetadata("missing-film", "missing-actor")

    expect(metadata.title).toBe("Performance Not Found")
    expect(metadata.robots).toEqual({ index: false, follow: true })
    expect(metadata.alternates).toBeUndefined()
  })

  it("noindexes a real performance that has fewer than two community ratings", () => {
    const metadata = buildRatePageMetadata(source({ communityRatingCount: 1 }))

    expect(metadata.title).toBe("Rate Marlon Brando in The Godfather (1972)")
    expect(metadata.robots).toEqual({ index: false, follow: true })
    expect(metadata.alternates).toEqual({
      canonical: "https://actorrating.com/rate/the-godfather-1972/marlon-brando",
    })
  })

  it("noindexes a MINOR credit even when it has enough ratings", () => {
    const metadata = buildRatePageMetadata(source({ communityRatingCount: 5, tier: "MINOR" }))

    expect(metadata.robots).toEqual({ index: false, follow: true })
    expect(metadata.title).toBe("Rate Marlon Brando in The Godfather (1972)")
  })
})
