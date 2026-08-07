import { readFile } from "fs/promises"
import path from "path"
import { ARIE_CONSTITUTION_PATH, ARIE_CONSTITUTION_VERSION } from "@/lib/arie/config"

let cached: { version: string; text: string } | null = null

/** Load Brand Constitution for injection into agent system context. */
export async function loadBrandConstitution(): Promise<{ version: string; text: string }> {
  if (cached) return cached
  const abs = path.join(process.cwd(), ARIE_CONSTITUTION_PATH)
  try {
    const text = await readFile(abs, "utf8")
    cached = { version: ARIE_CONSTITUTION_VERSION, text }
    return cached
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(
      `constitution_missing: ${ARIE_CONSTITUTION_PATH} (${detail}). Ensure the Coolify image copies docs/arie/BRAND_CONSTITUTION.md.`,
    )
  }
}
