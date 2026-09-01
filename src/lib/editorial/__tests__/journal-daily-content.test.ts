import {
  buildVariedDailyNews,
  buildVariedStoryFromFacts,
  journalDayHash,
} from "../journal-daily-content"
import type { PerformanceFactsPack } from "../performance-facts"
import { countMarkdownWords, ensureJournalMinimum, JOURNAL_MIN_NEWS_WORDS, JOURNAL_MIN_STORY_WORDS } from "../journal-standards"

const sampleFacts: PerformanceFactsPack = {
  actorName: "Michael B. Jordan",
  actorSlug: "michael-b-jordan",
  movieTitle: "Sinners",
  movieYear: 2025,
  movieSlug: "sinners-2025",
  director: "Ryan Coogler",
  genres: ["Horror", "Thriller"],
  character: "Smoke / Stack",
  tier: "LEAD",
  ratingCount: 12,
  avg10: 8.4,
  dimensions: {},
  strongestDimensions: ["Screen Presence", "Emotional Range & Depth"],
  weakestDimensions: ["Chemistry & Interaction"],
  relatedPerformanceLabels: [],
}

const sampleTopic = {
  key: "vibes-vs-craft",
  title: "Vibes are not a criterion",
  description: "A daily reminder: ActorRating’s five sliders punish vibe-only scoring.",
  intro: "If you cannot name the acting choice you scored, you scored a vibe.",
  sections: [
    {
      heading: "Open the tools",
      body: "Emotional Range, Character Believability, Performance Quality, Screen Presence, and Chemistry are separate questions.",
    },
    {
      heading: "Draft vs final",
      body: "Quick-rate if you must. Before you treat a number as settled, name one scene.",
    },
  ],
}

describe("journal daily content", () => {
  it("picks different story angles on different days", () => {
    const a = buildVariedStoryFromFacts(sampleFacts, "2026-09-01")
    const b = buildVariedStoryFromFacts(sampleFacts, "2026-09-02")
    expect(a.bodyMarkdown).not.toEqual(b.bodyMarkdown)
    expect(a.title).not.toEqual(b.title)
  })

  it("meets minimum story word count", () => {
    for (let i = 0; i < 6; i++) {
      const day = `2026-09-0${i + 1}`
      const story = buildVariedStoryFromFacts(sampleFacts, day)
      const body = ensureJournalMinimum("story", story.bodyMarkdown)
      expect(countMarkdownWords(body)).toBeGreaterThanOrEqual(JOURNAL_MIN_STORY_WORDS)
    }
  })

  it("varies news format and copy by day", () => {
    const a = buildVariedDailyNews(sampleTopic, "2026-09-01", sampleFacts)
    const b = buildVariedDailyNews(sampleTopic, "2026-09-02", sampleFacts)
    expect(a.bodyMarkdown).not.toEqual(b.bodyMarkdown)
    expect(a.formatKey).not.toBe(b.formatKey)
  })

  it("meets minimum news word count", () => {
    for (let i = 0; i < 4; i++) {
      const day = `2026-09-0${i + 1}`
      const news = buildVariedDailyNews(sampleTopic, day, sampleFacts)
      const body = ensureJournalMinimum("news", news.bodyMarkdown)
      expect(countMarkdownWords(body)).toBeGreaterThanOrEqual(JOURNAL_MIN_NEWS_WORDS)
    }
  })

  it("uses deterministic topic index from date", () => {
    expect(journalDayHash("2026-09-01") % 2).toBe(journalDayHash("2026-09-01") % 2)
    expect(journalDayHash("2026-09-01")).not.toBe(journalDayHash("2026-09-08"))
  })
})
