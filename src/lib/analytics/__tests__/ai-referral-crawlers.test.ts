/**
 * @jest-environment node
 */

import {
  AI_REFERRAL_CHANNEL_KEY,
  isAiReferralReferrer,
  aiReferralChannelKeyFromReferrer,
} from "@/lib/analytics/ai-referral"
import {
  classifyAiCrawlerFamily,
  aiCrawlerFamilyId,
} from "@/lib/analytics/ai-crawlers"

describe("isAiReferralReferrer", () => {
  it("matches known AI hosts", () => {
    expect(isAiReferralReferrer("https://chatgpt.com/")).toBe(true)
    expect(isAiReferralReferrer("https://chat.openai.com/c/123")).toBe(true)
    expect(isAiReferralReferrer("https://www.perplexity.ai/search")).toBe(true)
    expect(isAiReferralReferrer("https://claude.ai/chat")).toBe(true)
    expect(isAiReferralReferrer("https://gemini.google.com/app")).toBe(true)
    expect(isAiReferralReferrer("https://copilot.microsoft.com/")).toBe(true)
    expect(isAiReferralReferrer("https://you.com/search?q=x")).toBe(true)
    expect(isAiReferralReferrer("https://www.phind.com/search")).toBe(true)
  })

  it("matches bing chat and duckduckgo ai assist paths", () => {
    expect(isAiReferralReferrer("https://www.bing.com/chat?q=hi")).toBe(true)
    expect(isAiReferralReferrer("https://duckduckgo.com/aichat")).toBe(true)
  })

  it("rejects ordinary search / social", () => {
    expect(isAiReferralReferrer("https://www.google.com/")).toBe(false)
    expect(isAiReferralReferrer("https://www.bing.com/search?q=x")).toBe(false)
    expect(isAiReferralReferrer("https://t.co/x")).toBe(false)
    expect(isAiReferralReferrer(null)).toBe(false)
    expect(isAiReferralReferrer("")).toBe(false)
  })

  it("returns the rolled-up channel key", () => {
    expect(aiReferralChannelKeyFromReferrer("https://chatgpt.com/")).toBe(
      AI_REFERRAL_CHANNEL_KEY,
    )
    expect(aiReferralChannelKeyFromReferrer("https://google.com/")).toBeNull()
  })
})

describe("classifyAiCrawlerFamily", () => {
  it("classifies known AI bot UAs", () => {
    expect(classifyAiCrawlerFamily("Mozilla/5.0 OAI-SearchBot/1.0")?.id).toBe(
      "openai_search",
    )
    expect(classifyAiCrawlerFamily("GPTBot/1.0")?.id).toBe("gptbot")
    expect(classifyAiCrawlerFamily("ChatGPT-User/1.0")?.id).toBe("chatgpt_user")
    expect(classifyAiCrawlerFamily("ClaudeBot/1.0")?.id).toBe("claudebot")
    expect(classifyAiCrawlerFamily("Claude-SearchBot")?.id).toBe("claude_search")
    expect(classifyAiCrawlerFamily("Claude-User")?.id).toBe("claude_user")
    expect(classifyAiCrawlerFamily("PerplexityBot/1.0")?.id).toBe("perplexitybot")
    expect(classifyAiCrawlerFamily("Perplexity-User")?.id).toBe("perplexity_user")
    expect(classifyAiCrawlerFamily("Google-Extended")?.id).toBe("google_extended")
    expect(classifyAiCrawlerFamily("Mozilla Googlebot/2.1")?.id).toBe(
      "googlebot_ref",
    )
    expect(classifyAiCrawlerFamily("Applebot-Extended")?.id).toBe(
      "applebot_extended",
    )
    expect(classifyAiCrawlerFamily("Bytespider")?.id).toBe("bytespider")
    expect(classifyAiCrawlerFamily("CCBot/2.0")?.id).toBe("ccbot")
    expect(classifyAiCrawlerFamily("Amazonbot/0.1")?.id).toBe("amazonbot")
    expect(classifyAiCrawlerFamily("meta-externalagent/1.1")?.id).toBe(
      "meta_external",
    )
  })

  it("does not count unknown UAs", () => {
    expect(classifyAiCrawlerFamily("Mozilla/5.0 Chrome/120.0")).toBeNull()
    expect(aiCrawlerFamilyId("curl/8.0")).toBeNull()
    expect(classifyAiCrawlerFamily("")).toBeNull()
    expect(classifyAiCrawlerFamily(null)).toBeNull()
  })

  it("prefers Google-Extended over Googlebot when both present", () => {
    expect(
      classifyAiCrawlerFamily("Mozilla Google-Extended Googlebot")?.id,
    ).toBe("google_extended")
  })
})
