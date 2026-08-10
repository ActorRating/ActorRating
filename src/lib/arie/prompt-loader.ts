import { readFile } from "fs/promises"
import path from "path"

const cache = new Map<string, string>()

/** Load a versioned ARIE prompt markdown file from docs/arie/prompts/. */
export async function loadAriePrompt(relPath: string): Promise<string> {
  const cached = cache.get(relPath)
  if (cached) return cached
  const abs = path.join(process.cwd(), "docs/arie/prompts", relPath)
  const text = await readFile(abs, "utf8")
  cache.set(relPath, text)
  return text
}

export function clearPromptCache(): void {
  cache.clear()
}
