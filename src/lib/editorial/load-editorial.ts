/**
 * Load editorial markdown from content/stories/*.md and content/news/*.md
 * (same gray-matter + marked pattern as curated lists).
 */
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { marked } from "marked"

export type EditorialKind = "story" | "news"

export type EditorialRelated = {
  actorSlug: string
  movieSlug: string
}

export type EditorialFrontmatter = {
  title: string
  description: string
  publishedAt: string | Date
  coverImage?: string | null
  related?: EditorialRelated[]
}

export type ParsedEditorialDocument = {
  kind: EditorialKind
  slug: string
  title: string
  description: string
  publishedAt: Date
  coverImage: string | null
  related: EditorialRelated[]
  bodyMarkdown: string
  fileMtime: Date
}

function editorialDirCandidates(kind: EditorialKind): string[] {
  const folder = kind === "story" ? "stories" : "news"
  return [
    path.join(process.cwd(), "content", folder),
    path.join(__dirname, "..", "..", "content", folder),
    path.join(__dirname, "..", "..", "..", "content", folder),
  ]
}

export function resolveEditorialDir(kind: EditorialKind): string | null {
  for (const dir of editorialDirCandidates(kind)) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir
    } catch {
      /* continue */
    }
  }
  return null
}

function parsePublishedAt(value: string | Date): Date {
  if (value instanceof Date) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid publishedAt: ${value}`)
  }
  return d
}

function parseRelated(
  related: EditorialRelated[] | undefined,
  file: string
): EditorialRelated[] {
  if (!related) return []
  if (!Array.isArray(related)) {
    console.warn(`[editorial] ${file}: related must be an array — ignoring`)
    return []
  }
  return related.map((e, i) => {
    if (!e?.actorSlug || !e?.movieSlug) {
      throw new Error(`[editorial] ${file} related[${i}] missing actorSlug/movieSlug`)
    }
    return {
      actorSlug: String(e.actorSlug).trim(),
      movieSlug: String(e.movieSlug).trim(),
    }
  })
}

function loadEditorialKind(kind: EditorialKind): ParsedEditorialDocument[] {
  const dir = resolveEditorialDir(kind)
  if (!dir) {
    console.warn(`[editorial] content/${kind === "story" ? "stories" : "news"} directory not found`)
    return []
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort()

  const docs: ParsedEditorialDocument[] = []
  for (const file of files) {
    const slug = file.replace(/\.md$/, "")
    const full = path.join(dir, file)
    const raw = fs.readFileSync(full, "utf-8")
    const { data, content } = matter(raw)
    const fm = data as Partial<EditorialFrontmatter>

    if (!fm.title || !fm.description || !fm.publishedAt) {
      console.warn(`[editorial] Skipping ${file}: missing title/description/publishedAt`)
      continue
    }

    const stat = fs.statSync(full)
    docs.push({
      kind,
      slug,
      title: String(fm.title),
      description: String(fm.description),
      publishedAt: parsePublishedAt(fm.publishedAt),
      coverImage: fm.coverImage ? String(fm.coverImage) : null,
      related: parseRelated(fm.related, file),
      bodyMarkdown: content.replace(/^\uFEFF/, "").trim(),
      fileMtime: stat.mtime,
    })
  }

  return docs.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
}

export function loadAllStories(): ParsedEditorialDocument[] {
  return loadEditorialKind("story")
}

export function loadAllNews(): ParsedEditorialDocument[] {
  return loadEditorialKind("news")
}

export function loadStoryBySlug(slug: string): ParsedEditorialDocument | null {
  return loadAllStories().find((d) => d.slug === slug) ?? null
}

export function loadNewsBySlug(slug: string): ParsedEditorialDocument | null {
  return loadAllNews().find((d) => d.slug === slug) ?? null
}

export function renderEditorialMarkdown(markdown: string): string {
  if (!markdown.trim()) return ""
  return marked.parse(markdown, { async: false }) as string
}

export function editorialHref(doc: Pick<ParsedEditorialDocument, "kind" | "slug">): string {
  return doc.kind === "story" ? `/stories/${doc.slug}` : `/news/${doc.slug}`
}

export type EditorialCard = {
  kind: EditorialKind
  slug: string
  title: string
  description: string
  publishedAt: string
  href: string
  coverImage: string | null
  actorImage?: string | null
  moviePoster?: string | null
}

export function toEditorialCard(doc: ParsedEditorialDocument): EditorialCard {
  return {
    kind: doc.kind,
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    publishedAt: doc.publishedAt.toISOString(),
    href: editorialHref(doc),
    coverImage: doc.coverImage,
  }
}
