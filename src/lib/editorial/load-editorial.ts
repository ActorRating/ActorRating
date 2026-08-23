/**
 * Load editorial markdown from content/stories/*.md and content/news/*.md,
 * merged with published SiteEditorial rows from the database (daily cron).
 */
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { marked } from "marked"
import { prisma } from "@/lib/prisma"

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

function parseRelatedJson(value: unknown, label: string): EditorialRelated[] {
  if (!value) return []
  if (!Array.isArray(value)) {
    console.warn(`[editorial] ${label}: related must be an array — ignoring`)
    return []
  }
  const out: EditorialRelated[] = []
  for (const e of value) {
    if (!e || typeof e !== "object") continue
    const row = e as { actorSlug?: unknown; movieSlug?: unknown }
    if (typeof row.actorSlug !== "string" || typeof row.movieSlug !== "string") continue
    out.push({
      actorSlug: row.actorSlug.trim(),
      movieSlug: row.movieSlug.trim(),
    })
  }
  return out
}

/** Filesystem-only load (sync) — used by sitemap scripts. */
export function loadEditorialKindFromFiles(kind: EditorialKind): ParsedEditorialDocument[] {
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

async function loadEditorialKindFromDb(kind: EditorialKind): Promise<ParsedEditorialDocument[]> {
  try {
    const rows = await prisma.siteEditorial.findMany({
      where: { kind, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    })
    return rows.map((row) => ({
      kind,
      slug: row.slug,
      title: row.title,
      description: row.description,
      publishedAt: row.publishedAt,
      coverImage: row.coverImage,
      related: parseRelatedJson(row.related, `db:${row.slug}`),
      bodyMarkdown: row.bodyMarkdown,
      fileMtime: row.updatedAt,
    }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg.includes("SiteEditorial") ||
      msg.includes("does not exist") ||
      msg.includes("P2021")
    ) {
      return []
    }
    console.warn(`[editorial] DB load failed for ${kind}:`, msg)
    return []
  }
}

function mergeEditorialDocs(
  files: ParsedEditorialDocument[],
  dbDocs: ParsedEditorialDocument[],
): ParsedEditorialDocument[] {
  const bySlug = new Map<string, ParsedEditorialDocument>()
  // Files win on slug collision (hand-authored canon).
  for (const doc of dbDocs) bySlug.set(doc.slug, doc)
  for (const doc of files) bySlug.set(doc.slug, doc)
  return [...bySlug.values()].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  )
}

async function loadEditorialKind(kind: EditorialKind): Promise<ParsedEditorialDocument[]> {
  const files = loadEditorialKindFromFiles(kind)
  const dbDocs = await loadEditorialKindFromDb(kind)
  return mergeEditorialDocs(files, dbDocs)
}

/** @deprecated Prefer loadAllStoriesAsync — sync file-only for scripts. */
export function loadAllStories(): ParsedEditorialDocument[] {
  return loadEditorialKindFromFiles("story")
}

/** @deprecated Prefer loadAllNewsAsync — sync file-only for scripts. */
export function loadAllNews(): ParsedEditorialDocument[] {
  return loadEditorialKindFromFiles("news")
}

export async function loadAllStoriesAsync(): Promise<ParsedEditorialDocument[]> {
  return loadEditorialKind("story")
}

export async function loadAllNewsAsync(): Promise<ParsedEditorialDocument[]> {
  return loadEditorialKind("news")
}

export async function loadStoryBySlug(slug: string): Promise<ParsedEditorialDocument | null> {
  return (await loadAllStoriesAsync()).find((d) => d.slug === slug) ?? null
}

export async function loadNewsBySlug(slug: string): Promise<ParsedEditorialDocument | null> {
  return (await loadAllNewsAsync()).find((d) => d.slug === slug) ?? null
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
