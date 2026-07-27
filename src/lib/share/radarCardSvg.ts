/**
 * Build a branded 5-axis radar card as SVG markup.
 * Axes order (clockwise from top, −90° offset):
 * Emotional Range, Technical Skill, Screen Presence, Character Depth, Chemistry
 */

export type RadarAxisScores = {
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
}

export type RadarCardInput = {
  width: number
  height: number
  actorName: string
  movieTitle: string
  movieYear?: number | null
  roleName?: string | null
  username: string
  scoreOutOf10: string
  quote?: string | null
  axes: RadarAxisScores
}

const AXIS_LABELS = [
  "Emotional Range",
  "Technical Skill",
  "Screen Presence",
  "Character Depth",
  "Chemistry",
] as const

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return `${str.slice(0, max - 1)}…`
}

/** Point on radar: angle index 0..4, value 0..100, radius max R, center cx/cy. */
function radarPoint(
  index: number,
  value: number,
  cx: number,
  cy: number,
  maxR: number,
): { x: number; y: number } {
  const t = (-Math.PI / 2) + (index * 2 * Math.PI) / 5
  const r = (clampScore(value) / 100) * maxR
  return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) }
}

function gridRing(
  level: number,
  cx: number,
  cy: number,
  maxR: number,
): string {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const p = radarPoint(i, level * 20, cx, cy, maxR)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  })
  return pts.join(" ")
}

export function buildRadarCardSvg(input: RadarCardInput): string {
  const { width: w, height: h } = input
  const gold = "#FFD700"
  const goldLight = "#FFE55C"
  const fg = "#FFFFFF"
  const isSquare = w === h || Math.abs(w - h) < 50

  const values = [
    input.axes.emotionalRangeDepth,
    input.axes.technicalSkill,
    input.axes.screenPresence,
    input.axes.characterBelievability,
    input.axes.chemistryInteraction,
  ].map(clampScore)

  // Layout: header band, radar center, optional quote, footer
  const cx = w / 2
  const cy = isSquare ? h * 0.48 : h * 0.52
  const maxR = isSquare ? Math.min(w, h) * 0.22 : Math.min(w, h) * 0.28

  const poly = values
    .map((v, i) => {
      const p = radarPoint(i, v, cx, cy, maxR)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(" ")

  const spokeLines = values
    .map((_, i) => {
      const tip = radarPoint(i, 100, cx, cy, maxR)
      return `<line x1="${cx}" y1="${cy}" x2="${tip.x.toFixed(1)}" y2="${tip.y.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`
    })
    .join("\n  ")

  const rings = [1, 2, 3, 4, 5]
    .map(
      (level) =>
        `<polygon points="${gridRing(level, cx, cy, maxR)}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`,
    )
    .join("\n  ")

  const labelNodes = AXIS_LABELS.map((label, i) => {
    const tip = radarPoint(i, 118, cx, cy, maxR)
    const score = Math.round(values[i]!)
    return `<text x="${tip.x.toFixed(1)}" y="${tip.y.toFixed(1)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${isSquare ? 18 : 16}" fill="rgba(255,255,255,0.75)" text-anchor="middle">${escapeXml(label)} (${score})</text>`
  }).join("\n  ")

  const titleLine = input.roleName
    ? `${input.actorName} as ${input.roleName}`
    : input.actorName
  const movieLine = input.movieYear
    ? `${input.movieTitle} (${input.movieYear})`
    : input.movieTitle

  const handle = input.username.startsWith("@")
    ? input.username
    : `@${input.username}`

  const quote = input.quote?.trim()
    ? truncate(input.quote.trim(), isSquare ? 120 : 90)
    : null

  const headerY = isSquare ? 56 : 42
  const titleY = isSquare ? 110 : 88
  const movieY = isSquare ? 148 : 118
  const quoteY = isSquare ? h - 120 : h - 70
  const footerY = isSquare ? h - 48 : h - 28

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${goldLight};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${gold};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="#000000"/>
  <text x="48" y="${headerY}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" font-weight="700" fill="url(#goldGradient)">ActorRating.com</text>
  <text x="${w - 48}" y="${headerY}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" fill="rgba(255,255,255,0.75)" text-anchor="end">${escapeXml(handle)}</text>
  <text x="${cx}" y="${titleY}" font-family="Georgia, serif" font-size="${isSquare ? 36 : 28}" font-weight="700" fill="#FFFFFF" text-anchor="middle">${escapeXml(truncate(titleLine, 48))}</text>
  <text x="${cx}" y="${movieY}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${isSquare ? 22 : 18}" fill="rgba(255,255,255,0.7)" text-anchor="middle">${escapeXml(truncate(movieLine, 52))}</text>
  ${rings}
  ${spokeLines}
  <polygon points="${poly}" fill="rgba(255,215,0,0.22)" stroke="${gold}" stroke-width="2.5"/>
  ${labelNodes}
  <text x="${cx}" y="${cy + 8}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${isSquare ? 42 : 36}" font-weight="800" fill="url(#goldGradient)" text-anchor="middle">${escapeXml(input.scoreOutOf10)}</text>
  ${
    quote
      ? `<text x="${cx}" y="${quoteY}" font-family="Georgia, serif" font-size="${isSquare ? 22 : 18}" font-style="italic" fill="rgba(255,255,255,0.8)" text-anchor="middle">“${escapeXml(quote)}”</text>`
      : ""
  }
  <text x="${cx}" y="${footerY}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" fill="rgba(255,255,255,0.55)" text-anchor="middle">actorrating.com</text>
</svg>`
}
