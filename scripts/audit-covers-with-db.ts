/**
 * Full cover audit with DB enrichment.
 * Run: npx tsx scripts/audit-covers-with-db.ts
 */
import { loadAllNewsAsync, loadAllStoriesAsync } from "../src/lib/editorial/load-editorial"
import { enrichListEntries } from "../src/lib/lists/enrich-entries"
import {
  buildEditorialCoverCandidates,
  isActorLedPiece,
  pickUniqueCoverWithKey,
} from "../src/lib/editorial/resolve-editorial-cover"

async function audit(label: string, docs: Awaited<ReturnType<typeof loadAllStoriesAsync>>) {
  const used = new Set<string>()
  const missing: string[] = []
  const actorLedWrong: string[] = []

  for (const doc of docs) {
    let enriched: Awaited<ReturnType<typeof enrichListEntries>> = []
    try {
      enriched = await enrichListEntries(doc.related.slice(0, 5), `${doc.kind}:${doc.slug}`)
    } catch {
      enriched = []
    }
    const candidates = buildEditorialCoverCandidates(doc, enriched)
    const picked = pickUniqueCoverWithKey(candidates, used)
    if (!picked) {
      missing.push(doc.slug)
    } else {
      used.add(picked.key)
      const primary = enriched.find((r) => r.exists)
      if (primary && isActorLedPiece(doc, primary)) {
        const headshot = primary.actorImageUrl
        const isActorImg =
          picked.url.includes("/editorial/") ||
          (headshot && picked.url.includes(headshot.split("/").pop() ?? "___"))
        if (!isActorImg && !picked.key.startsWith("actor:")) {
          actorLedWrong.push(`${doc.slug} -> ${picked.key}`)
        }
      }
    }
  }

  console.log(`\n${label}: ${docs.length} total, ${missing.length} missing, ${used.size} unique keys`)
  if (missing.length) console.log("  missing:", missing.join(", "))
  if (actorLedWrong.length) console.log("  actor-led not headshot:", actorLedWrong.slice(0, 10).join("\n    "))
}

async function main() {
  await audit("stories", await loadAllStoriesAsync())
  await audit("news", await loadAllNewsAsync())
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
