/**
 * @jest-environment node
 */

import {
  buildMovieAggregateRating,
  MIN_AGGREGATE_RATING_COUNT,
  personNodeHasAggregateRating,
} from "@/lib/seo/aggregate-rating-jsonld"
import { buildActorJsonLd } from "@/lib/seo/actor-jsonld"
import { buildMovieJsonLd } from "@/lib/seo/movie-jsonld"
import type { ActorPageData } from "@/lib/actor-page-data"

describe("buildMovieAggregateRating", () => {
  it("requires at least MIN ratings", () => {
    expect(MIN_AGGREGATE_RATING_COUNT).toBe(3)
    expect(
      buildMovieAggregateRating({ ratingValue10: 8.9, ratingCount: 1 }),
    ).toBeNull()
    expect(
      buildMovieAggregateRating({ ratingValue10: 8.9, ratingCount: 2 }),
    ).toBeNull()
    expect(
      buildMovieAggregateRating({ ratingValue10: 8.9, ratingCount: 3 }),
    ).toEqual({
      "@type": "AggregateRating",
      ratingValue: "8.9",
      ratingCount: "3",
      bestRating: 10,
      worstRating: 0,
    })
  })

  it("rejects missing or non-positive values", () => {
    expect(
      buildMovieAggregateRating({ ratingValue10: null, ratingCount: 10 }),
    ).toBeNull()
    expect(
      buildMovieAggregateRating({ ratingValue10: 0, ratingCount: 10 }),
    ).toBeNull()
  })
})

describe("buildActorJsonLd", () => {
  const baseData = {
    id: "a1",
    slug: "keira-knightley",
    name: "Keira Knightley",
    bio: null,
    totalRatingCount: 1,
    aggregateWeightedScore: 89,
    performances: [
      {
        id: "p1",
        movie: { id: "m1", slug: "pride-prejudice-2005", title: "Pride & Prejudice" },
      },
    ],
  } as unknown as ActorPageData

  it("emits Person + hasPart and never aggregateRating (even with ratings)", () => {
    const jsonLd = buildActorJsonLd(baseData, "https://actorrating.com")
    expect(jsonLd["@type"]).toBe("Person")
    expect(jsonLd.aggregateRating).toBeUndefined()
    expect(personNodeHasAggregateRating(jsonLd)).toBe(false)
    expect(jsonLd.hasPart).toEqual([
      {
        "@type": "Movie",
        name: "Pride & Prejudice",
        url: "https://actorrating.com/movies/pride-prejudice-2005",
      },
    ])
  })
})

describe("buildMovieJsonLd", () => {
  it("omits aggregateRating when n < 3", () => {
    const jsonLd = buildMovieJsonLd(
      {
        id: "m1",
        slug: "inception-2010",
        title: "Inception",
        year: 2010,
        totalRatingCount: 1,
        aggregateWeightedScore: 89,
        performances: [],
      },
      "https://actorrating.com",
    )
    expect(jsonLd["@type"]).toBe("Movie")
    expect(jsonLd.aggregateRating).toBeUndefined()
  })

  it("includes aggregateRating on Movie when n >= 3", () => {
    const jsonLd = buildMovieJsonLd(
      {
        id: "m1",
        slug: "inception-2010",
        title: "Inception",
        year: 2010,
        totalRatingCount: 5,
        aggregateWeightedScore: 89,
        performances: [
          { actor: { name: "Leo", slug: "leonardo-dicaprio", id: "a1" } },
        ],
      },
      "https://actorrating.com",
    )
    expect(jsonLd.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: "8.9",
      ratingCount: "5",
      bestRating: 10,
      worstRating: 0,
    })
    expect(personNodeHasAggregateRating(jsonLd)).toBe(false)
  })
})
