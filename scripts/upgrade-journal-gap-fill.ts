/**
 * Apply unique covers + body expansions to Jul–Aug 2026 gap-fill markdown.
 * Run: npx tsx scripts/upgrade-journal-gap-fill.ts
 */
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { GAP_FILL_UPGRADES } from "./data/journal-gap-fill-upgrades"
import {
  countMarkdownWords,
  JOURNAL_MIN_NEWS_WORDS,
  JOURNAL_MIN_STORY_WORDS,
} from "../src/lib/editorial/journal-standards"

function patchFrontmatterCover(raw: string, coverImage: string): string {
  if (/^coverImage:/m.test(raw)) {
    return raw.replace(/^coverImage:.*$/m, `coverImage: ${JSON.stringify(coverImage)}`)
  }
  return raw.replace(/^(publishedAt:.*)$/m, `$1\ncoverImage: ${JSON.stringify(coverImage)}`)
}

const NEWS_EXTRA = `## Why this lives in News

Stories chase the release-week heat — cast carousels, premiere weather, the performance argument people are already having. News is the rulebook: how to read the five criteria, when to edit, what box office cannot tell you.

If this piece felt useful, pick one performance you rated this month and re-open it with one section above in mind. That is how journal rules become scoreboard literacy instead of lecture notes.`

function main() {
  let updated = 0
  let skipped = 0
  const warnings: string[] = []

  for (const [slug, upgrade] of Object.entries(GAP_FILL_UPGRADES)) {
    const kind = fs.existsSync(path.join("content/stories", `${slug}.md`)) ? "stories" : "news"
    const file = path.join("content", kind, `${slug}.md`)
    if (!fs.existsSync(file)) {
      skipped += 1
      warnings.push(`missing: ${slug}`)
      continue
    }

    const raw = fs.readFileSync(file, "utf8")
    const parsed = matter(raw)
    let body = parsed.content.trim()

    const minWords = kind === "stories" ? JOURNAL_MIN_STORY_WORDS : JOURNAL_MIN_NEWS_WORDS
    if (countMarkdownWords(body) < minWords) {
      if (!body.includes(upgrade.expansion.trim().slice(0, 40))) {
        body = `${body}\n\n${upgrade.expansion.trim()}`
      }
      if (kind === "news" && countMarkdownWords(body) < minWords && !body.includes("Why this lives in News")) {
        body = `${body}\n\n${NEWS_EXTRA}`
      }
    }

    const wordCount = countMarkdownWords(body)
    if (wordCount < minWords) {
      warnings.push(`${slug}: still short (${wordCount}w)`)
    }

    let frontmatter = patchFrontmatterCover(parsed.matter, upgrade.coverImage)
    const out = `---\n${frontmatter.trim()}\n---\n\n${body}\n`
    fs.writeFileSync(file, out, "utf8")
    updated += 1
    console.log(`upgraded ${kind}/${slug}.md — ${wordCount}w — cover set`)
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped}`)
  if (warnings.length) {
    console.warn("Warnings:\n" + warnings.map((w) => `  - ${w}`).join("\n"))
  }
}

main()
