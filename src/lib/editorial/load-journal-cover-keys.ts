import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { normalizeCoverKey } from "@/lib/editorial/resolve-editorial-cover"
import { resolveEditorialDir, type EditorialKind } from "@/lib/editorial/load-editorial"

/** Collect normalized cover keys already used in markdown frontmatter (for cron de-dupe). */
export function loadMarkdownCoverKeys(kind: EditorialKind): Set<string> {
  const dir = resolveEditorialDir(kind)
  const keys = new Set<string>()
  if (!dir) return keys

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf8")
      const { data } = matter(raw)
      const cover = data?.coverImage
      if (typeof cover === "string" && cover.trim()) {
        keys.add(normalizeCoverKey(cover.trim()))
      }
    } catch {
      /* skip */
    }
  }
  return keys
}
