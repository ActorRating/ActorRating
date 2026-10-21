/**
 * Read-only HTML thinness audit for actor (and optional rate/movie) URLs.
 *
 * Usage:
 *   npx tsx scripts/audit-thin-html.ts --base=http://127.0.0.1:3000 --slugs=christopher-lee,keira-knightley
 *   npx tsx scripts/audit-thin-html.ts --base=https://actorrating.com --from-sitemap --limit=20 --repeats=3
 *
 * Reports per URL × UA × attempt: status, visible words, /movies/ and /rate/ link counts,
 * and whether title / description / canonical sit inside <head>.
 */

import { parseArgs } from "node:util"

const GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

type Row = {
  url: string
  ua: "googlebot" | "browser"
  attempt: number
  status: number | string
  words: number
  bytes: number
  movieLinks: number
  rateLinks: number
  titleInHead: boolean
  descInHead: boolean
  canonInHead: boolean
  thin: boolean
}

function stripTagsVisibleWords(html: string): number {
  const without = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
  return (without.match(/[A-Za-z0-9']+/g) || []).length
}

function analyze(html: string) {
  const low = html.toLowerCase()
  const headEnd = low.indexOf("</head>")
  const titleIdx = low.indexOf("<title")
  const descIdx = low.indexOf('name="description"')
  const canonIdx = html.indexOf('rel="canonical"')
  const inHead = (idx: number) => idx >= 0 && headEnd >= 0 && idx < headEnd
  const words = stripTagsVisibleWords(html)
  const movieLinks = (html.match(/href="\/movies\/[^"]+"/g) || []).length
  const rateLinks = (html.match(/href="\/rate\/[^"]+"/g) || []).length
  return {
    words,
    bytes: Buffer.byteLength(html, "utf8"),
    movieLinks,
    rateLinks,
    titleInHead: inHead(titleIdx),
    descInHead: inHead(descIdx),
    canonInHead: inHead(canonIdx),
    thin: words < 50 && movieLinks === 0 && rateLinks === 0,
  }
}

async function fetchHtml(url: string, ua: string): Promise<{ status: number; html: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": ua, accept: "text/html" },
    redirect: "follow",
  })
  const html = await res.text()
  return { status: res.status, html }
}

async function sampleActorUrlsFromSitemap(base: string, limit: number): Promise<string[]> {
  const indexXml = await (await fetch(`${base.replace(/\/$/, "")}/sitemap.xml`)).text()
  const child = [...indexXml.matchAll(/<loc>([^<]*actors-\d+\.xml)<\/loc>/g)].map((m) => m[1]!)
  const urls: string[] = []
  for (const loc of child) {
    const xml = await (await fetch(loc)).text()
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      urls.push(m[1]!)
      if (urls.length >= limit * 3) break
    }
    if (urls.length >= limit * 3) break
  }
  // Mix early + mid samples
  const well = urls.slice(0, Math.ceil(limit / 2))
  const obscure = urls.slice(Math.floor(urls.length / 2), Math.floor(urls.length / 2) + Math.floor(limit / 2))
  return [...new Set([...well, ...obscure])].slice(0, limit)
}

async function main() {
  const { values } = parseArgs({
    options: {
      base: { type: "string", default: "http://127.0.0.1:3000" },
      slugs: { type: "string" },
      "from-sitemap": { type: "boolean", default: false },
      limit: { type: "string", default: "20" },
      repeats: { type: "string", default: "3" },
    },
  })

  const base = (values.base || "http://127.0.0.1:3000").replace(/\/$/, "")
  const repeats = Math.max(1, parseInt(values.repeats || "3", 10) || 3)
  const limit = Math.max(1, parseInt(values.limit || "20", 10) || 20)

  let urls: string[] = []
  if (values.slugs) {
    urls = values.slugs.split(",").map((s) => `${base}/actors/${s.trim()}`).filter(Boolean)
  } else if (values["from-sitemap"]) {
    urls = await sampleActorUrlsFromSitemap(base, limit)
  } else {
    console.error("Provide --slugs=a,b or --from-sitemap")
    process.exit(1)
  }

  const rows: Row[] = []
  for (const url of urls) {
    for (const [uaLabel, ua] of [
      ["googlebot", GOOGLEBOT],
      ["browser", CHROME],
    ] as const) {
      for (let attempt = 1; attempt <= repeats; attempt++) {
        try {
          const { status, html } = await fetchHtml(url, ua)
          const a = analyze(html)
          rows.push({
            url,
            ua: uaLabel,
            attempt,
            status,
            ...a,
          })
          console.log(
            `${uaLabel.padEnd(9)} #${attempt} ${status} words=${String(a.words).padStart(5)} movies=${String(a.movieLinks).padStart(3)} rates=${String(a.rateLinks).padStart(3)} thin=${a.thin} head(t/d/c)=${a.titleInHead}/${a.descInHead}/${a.canonInHead} ${url.replace(base, "")}`
          )
        } catch (e) {
          rows.push({
            url,
            ua: uaLabel,
            attempt,
            status: `ERR:${(e as Error).message}`,
            words: 0,
            bytes: 0,
            movieLinks: 0,
            rateLinks: 0,
            titleInHead: false,
            descInHead: false,
            canonInHead: false,
            thin: true,
          })
          console.log(`${uaLabel} #${attempt} ERR ${url} ${(e as Error).message}`)
        }
      }
    }
  }

  const google = rows.filter((r) => r.ua === "googlebot")
  const thinRate =
    google.length === 0
      ? 0
      : google.filter((r) => r.thin).length / google.length
  const byUrl = new Map<string, Row[]>()
  for (const r of google) {
    const list = byUrl.get(r.url) || []
    list.push(r)
    byUrl.set(r.url, list)
  }
  let alwaysThin = 0
  let sometimesThin = 0
  let neverThin = 0
  for (const [, list] of byUrl) {
    const thinCount = list.filter((r) => r.thin).length
    if (thinCount === list.length) alwaysThin += 1
    else if (thinCount === 0) neverThin += 1
    else sometimesThin += 1
  }

  console.log("\n=== SUMMARY (Googlebot) ===")
  console.log(`URLs: ${byUrl.size}`)
  console.log(`Attempts: ${google.length}`)
  console.log(`Thin attempt rate: ${(thinRate * 100).toFixed(1)}%`)
  console.log(`Always thin: ${alwaysThin}`)
  console.log(`Sometimes thin: ${sometimesThin}`)
  console.log(`Never thin: ${neverThin}`)
  console.log(
    `Canon in <head>: ${google.filter((r) => r.canonInHead).length}/${google.length}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
