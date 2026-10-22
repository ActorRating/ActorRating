/**
 * @jest-environment node
 */

import {
  AI_TRAINING_ALLOWED,
  AI_TRAINING_BOTS,
  AI_SEARCH_AND_USER_BOTS,
  buildRobotsTxt,
} from "@/lib/seo/ai-bot-policy"

describe("buildRobotsTxt", () => {
  it("allows search/user bots and respects training toggle", () => {
    const allowed = buildRobotsTxt({ trainingAllowed: true })
    expect(allowed).toContain("Sitemap: https://actorrating.com/sitemap.xml")
    expect(allowed).toContain("Disallow: /admin")
    expect(allowed).toContain("Disallow: /api/")
    for (const bot of AI_SEARCH_AND_USER_BOTS) {
      expect(allowed).toContain(`User-agent: ${bot}`)
    }
    for (const bot of AI_TRAINING_BOTS) {
      expect(allowed).toMatch(
        new RegExp(`User-agent: ${bot}\\nAllow: /`),
      )
    }

    const blocked = buildRobotsTxt({ trainingAllowed: false })
    for (const bot of AI_TRAINING_BOTS) {
      expect(blocked).toMatch(
        new RegExp(`User-agent: ${bot}\\nDisallow: /`),
      )
    }
  })

  it("defaults AI_TRAINING_ALLOWED to true", () => {
    expect(AI_TRAINING_ALLOWED).toBe(true)
  })
})
