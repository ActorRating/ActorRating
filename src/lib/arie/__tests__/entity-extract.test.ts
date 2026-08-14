/**
 * Source→entity mention evidence: short/common titles need work context.
 * No title blacklist — Focus/Film fail on generic collocation, not by name.
 */

import {
  constrainEntitiesToSource,
  extractEntitiesFromText,
  isAcceptableMovieTitleMention,
  type ExtractedEntities,
} from "@/lib/arie/entity-extract"
import { textMentionsTitle } from "@/lib/arie/context-builder"
import { primaryMovieId } from "@/lib/arie/original-score"

const BUSAN =
  "Busan's Asian Contents & Film Market Names Japan 2026 Focus Country for Producer Hub"

const ANIMALS =
  "Ben Affleck and Kerry Washington star in the official trailer for Netflix's Animals"

const FOCUS_EXPLICIT = "Focus (2015), starring Will Smith and Margot Robbie"

const FOCUS_QUOTED = "'Focus' starring Will Smith and Margot Robbie"

const FOCUS_STARS_IN = "Will Smith and Margot Robbie star in Focus"

const FOCUS_THE_FILM = "the 2015 film Focus"

function movie(
  over: Partial<ExtractedEntities["movies"][number]> & Pick<ExtractedEntities["movies"][number], "id" | "title" | "year">,
): ExtractedEntities["movies"][number] {
  return {
    slug: over.slug ?? over.title.toLowerCase(),
    director: over.director ?? null,
    genre: over.genre ?? null,
    indexingCohort: over.indexingCohort ?? 1,
    confidence: over.confidence ?? 75,
    ...over,
  }
}

function entities(over: Partial<ExtractedEntities> = {}): ExtractedEntities {
  return {
    actors: [],
    movies: [],
    directors: [],
    unresolved: [],
    ...over,
  }
}

const focus2015 = movie({
  id: "m-focus",
  title: "Focus",
  year: 2015,
  director: "Glenn Ficarra",
})
const film1965 = movie({
  id: "m-film",
  title: "Film",
  year: 1965,
  director: "Richard Pearce",
})
const animalsMovie = movie({
  id: "m-animals",
  title: "Animals",
  year: 2026,
})

describe("isAcceptableMovieTitleMention — Busan / generic compounds", () => {
  it("does not treat Focus Country as the 2015 film", () => {
    expect(isAcceptableMovieTitleMention(BUSAN, "Focus")).toBe(false)
    expect(textMentionsTitle(BUSAN, "Focus")).toBe(false)
  })

  it("does not treat Film Market / film festival language as Film (1965)", () => {
    expect(isAcceptableMovieTitleMention(BUSAN, "Film")).toBe(false)
    expect(textMentionsTitle(BUSAN, "Film")).toBe(false)
    for (const phrase of [
      "film festival",
      "film market",
      "international film",
      "film director",
      "Asian Contents & Film Market",
    ]) {
      expect(isAcceptableMovieTitleMention(phrase, "Film")).toBe(false)
      expect(textMentionsTitle(phrase, "Film")).toBe(false)
    }
  })

  it("does not accept focus country for producer hub", () => {
    expect(
      isAcceptableMovieTitleMention(
        "Japan named 2026 focus country for producer hub",
        "Focus",
      ),
    ).toBe(false)
  })
})

describe("isAcceptableMovieTitleMention — legitimate Focus / Animals", () => {
  it("accepts explicit Focus (2015) work mentions", () => {
    expect(isAcceptableMovieTitleMention(FOCUS_EXPLICIT, "Focus")).toBe(true)
    expect(isAcceptableMovieTitleMention(FOCUS_QUOTED, "Focus")).toBe(true)
    expect(isAcceptableMovieTitleMention(FOCUS_STARS_IN, "Focus")).toBe(true)
    expect(isAcceptableMovieTitleMention(FOCUS_THE_FILM, "Focus")).toBe(true)
    expect(textMentionsTitle(FOCUS_EXPLICIT, "Focus")).toBe(true)
  })

  it("accepts Animals when the source is actually about that title", () => {
    expect(isAcceptableMovieTitleMention(ANIMALS, "Animals")).toBe(true)
    expect(textMentionsTitle(ANIMALS, "Animals")).toBe(true)
    expect(
      isAcceptableMovieTitleMention(
        "I think this official trailer for Animals just dropped — first look is here.",
        "Animals",
      ),
    ).toBe(true)
  })

  it("still matches long titles without extra evidence", () => {
    expect(
      textMentionsTitle(
        "James Marsden in Avengers: Secret Wars as Cyclops",
        "Avengers: Secret Wars",
      ),
    ).toBe(true)
  })
})

describe("constrainEntitiesToSource / primaryMovie", () => {
  it("Busan: drops Focus and Film so they cannot become primaryMovie or graph seeds", () => {
    const poisoned = entities({
      movies: [focus2015, film1965],
      directors: [{ name: "Richard Pearce", confidence: 88 }],
    })
    const safe = constrainEntitiesToSource(BUSAN, poisoned)
    expect(safe.movies.map((m) => m.title)).toEqual([])
    expect(primaryMovieId(safe)).toBeNull()
    expect(safe.movies.some((m) => m.id === "m-focus")).toBe(false)
    expect(safe.movies.some((m) => m.id === "m-film")).toBe(false)
  })

  it("keeps Focus (2015) when the source names that film", () => {
    const raw = entities({ movies: [focus2015, film1965] })
    const safe = constrainEntitiesToSource(FOCUS_EXPLICIT, raw)
    expect(safe.movies.map((m) => m.title)).toEqual(["Focus"])
    expect(primaryMovieId(safe)).toBe("m-focus")
  })

  it("keeps Animals as the primary movie for the trailer source", () => {
    const raw = entities({ movies: [animalsMovie] })
    const safe = constrainEntitiesToSource(ANIMALS, raw)
    expect(safe.movies).toHaveLength(1)
    expect(safe.movies[0]?.title).toBe("Animals")
    expect(primaryMovieId(safe)).toBe("m-animals")
  })
})

describe("extractEntitiesFromText filters catalog substring hits", () => {
  function prismaReturning(catalog: {
    actors?: Array<{ id: string; name: string; slug: string | null }>
    directors?: Array<{ director: string; filmCount: number }>
    movies?: Array<{
      id: string
      title: string
      year: number
      slug: string | null
      director: string | null
      genre: string | null
      indexingCohort: number
    }>
  }) {
    return {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce(catalog.actors ?? [])
        .mockResolvedValueOnce(catalog.directors ?? [])
        .mockResolvedValueOnce(catalog.movies ?? []),
    }
  }

  const catalogMovies = [
    {
      id: "m-focus",
      title: "Focus",
      year: 2015,
      slug: "focus",
      director: "Glenn Ficarra",
      genre: "Crime",
      indexingCohort: 1,
    },
    {
      id: "m-film",
      title: "Film",
      year: 1965,
      slug: "film",
      director: "Richard Pearce",
      genre: null,
      indexingCohort: 1,
    },
    {
      id: "m-animals",
      title: "Animals",
      year: 2026,
      slug: "animals",
      director: null,
      genre: null,
      indexingCohort: 1,
    },
  ]

  it("Busan catalog hits for Focus/Film are discarded", async () => {
    const prisma = prismaReturning({
      // Real SQL would not return these names — they are not in the source.
      actors: [],
      directors: [],
      movies: catalogMovies,
    })
    const extracted = await extractEntitiesFromText(prisma as never, BUSAN)
    expect(extracted.movies.map((m) => m.title)).toEqual([])
    expect(extracted.actors).toEqual([])
    expect(extracted.directors).toEqual([])
    expect(primaryMovieId(extracted)).toBeNull()
  })

  it("explicit Focus (2015) is extracted from the same catalog", async () => {
    const prisma = prismaReturning({ movies: catalogMovies })
    const extracted = await extractEntitiesFromText(prisma as never, FOCUS_EXPLICIT)
    expect(extracted.movies.some((m) => m.title === "Focus" && m.year === 2015)).toBe(true)
    expect(extracted.movies.some((m) => m.title === "Film")).toBe(false)
  })

  it("Animals trailer source extracts Animals", async () => {
    const prisma = prismaReturning({ movies: catalogMovies })
    const extracted = await extractEntitiesFromText(prisma as never, ANIMALS)
    expect(extracted.movies.map((m) => m.title)).toEqual(["Animals"])
  })
})
