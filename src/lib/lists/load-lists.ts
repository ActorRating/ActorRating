/**
 * Load curated listicle markdown from content/lists/*.md
 */
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { marked } from "marked"

export type ListEntryFrontmatter = {
  actorSlug: string
  movieSlug: string
}

export type ListFrontmatter = {
  title: string
  description: string
  publishedAt: string | Date
  entries: ListEntryFrontmatter[]
}

export type ParsedListDocument = {
  slug: string
  title: string
  description: string
  publishedAt: Date
  entries: ListEntryFrontmatter[]
  /** Markdown before the first ## heading */
  introMarkdown: string
  /** Markdown bodies for each ## section, in order (aligned with entries) */
  entryMarkdown: string[]
  /** Raw file mtime for sitemap lastmod fallback */
  fileMtime: Date
}

const LISTS_DIR = path.join(process.cwd(), "content", "lists")

function listsDirCandidates(): string[] {
  return [
    LISTS_DIR,
    // Standalone Docker: content copied next to server.js
    path.join(process.cwd(), "content", "lists"),
    path.join(__dirname, "..", "..", "content", "lists"),
    path.join(__dirname, "..", "..", "..", "content", "lists"),
  ]
}

export function resolveListsDir(): string | null {
  for (const dir of listsDirCandidates()) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir
    } catch {
      /* continue */
    }
  }
  return null
}

function splitBody(markdown: string): { intro: string; sections: string[] } {
  const trimmed = markdown.replace(/^\uFEFF/, "").trim()
  if (!trimmed) return { intro: "", sections: [] }

  const headingRe = /^##[ \t]+.+$/gm
  const matches = [...trimmed.matchAll(headingRe)]
  if (matches.length === 0) {
    return { intro: trimmed, sections: [] }
  }

  const firstIdx = matches[0].index ?? 0
  const intro = trimmed.slice(0, firstIdx).trim()
  const sections: string[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i][0].length
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? trimmed.length) : trimmed.length
    sections.push(trimmed.slice(start, end).trim())
  }
  return { intro, sections }
}

function parsePublishedAt(value: string | Date): Date {
  if (value instanceof Date) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid publishedAt: ${value}`)
  }
  return d
}

export function loadAllLists(): ParsedListDocument[] {
  const dir = resolveListsDir()
  if (!dir) {
    console.warn("[lists] content/lists directory not found")
    return []
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort()

  const lists: ParsedListDocument[] = []
  for (const file of files) {
    const slug = file.replace(/\.md$/, "")
    const full = path.join(dir, file)
    const raw = fs.readFileSync(full, "utf-8")
    const { data, content } = matter(raw)
    const fm = data as Partial<ListFrontmatter>

    if (!fm.title || !fm.description || !fm.publishedAt) {
      console.warn(`[lists] Skipping ${file}: missing title/description/publishedAt`)
      continue
    }
    if (!Array.isArray(fm.entries) || fm.entries.length === 0) {
      console.warn(`[lists] Skipping ${file}: entries must be a non-empty array`)
      continue
    }

    const entries = fm.entries.map((e, i) => {
      if (!e?.actorSlug || !e?.movieSlug) {
        throw new Error(`[lists] ${file} entry[${i}] missing actorSlug/movieSlug`)
      }
      return {
        actorSlug: String(e.actorSlug).trim(),
        movieSlug: String(e.movieSlug).trim(),
      }
    })

    const { intro, sections } = splitBody(content)
    if (sections.length > 0 && sections.length !== entries.length) {
      console.warn(
        `[lists] ${file}: ${entries.length} entries but ${sections.length} ## sections — pairing by index`,
      )
    }

    const stat = fs.statSync(full)
    lists.push({
      slug,
      title: String(fm.title),
      description: String(fm.description),
      publishedAt: parsePublishedAt(fm.publishedAt),
      entries,
      introMarkdown: intro,
      entryMarkdown: entries.map((_, i) => sections[i] ?? ""),
      fileMtime: stat.mtime,
    })
  }

  return lists.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
}

export function loadListBySlug(slug: string): ParsedListDocument | null {
  return loadAllLists().find((l) => l.slug === slug) ?? null
}

export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown.trim()) return ""
  return marked.parse(markdown, { async: false }) as string
}
