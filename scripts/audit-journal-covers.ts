/**
 * Offline check: cover de-dupe per index (no DB).
 * Run: npx tsx scripts/audit-journal-covers.ts
 */
import { loadAllNewsAsync, loadAllStoriesAsync } from "../src/lib/editorial/load-editorial"
import {
  buildEditorialCoverCandidates,
  pickUniqueCoverWithKey,
} from "../src/lib/editorial/resolve-editorial-cover"

async function auditKind(label: string, docs: Awaited<ReturnType<typeof loadAllStoriesAsync>>) {
  const used = new Set<string>()
  let missing = 0

  for (const doc of docs) {
    const candidates = buildEditorialCoverCandidates(doc, [])
    const picked = pickUniqueCoverWithKey(candidates, used)
    if (!picked) {
      missing++
      console.log(`  missing: ${doc.slug}`)
      continue
    }
    used.add(picked.key)
  }

  console.log(`${label}: ${docs.length} cards, ${used.size} unique keys, ${missing} missing (offline)`)
}

async function main() {
  await auditKind("stories", await loadAllStoriesAsync())
  await auditKind("news", await loadAllNewsAsync())
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
