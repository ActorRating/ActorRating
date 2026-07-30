/**
 * Build a branded 5-axis radar card as SVG markup.
 * Axes order (clockwise from top, −90° offset):
 * Emotional Impact, Character Depth, Screen Presence, Technical Skill, Originality
 * (Originality is chemistryInteraction — SVG label only.)
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
  /** Absolute URL or data URL for a vertical actor portrait at the radar center. */
  actorImageUrl?: string | null
}

/** Line 1 of each axis label (white). Empty second line for single-word axes. */
const AXIS_LABELS = [
  "Emotional",
  "Character",
  "Screen",
  "Technical",
  "Originality",
] as const

const AXIS_SUBLABELS = [
  "Impact",
  "Depth",
  "Presence",
  "Skill",
  "",
] as const

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

/**
 * When criteria are missing/zero but an overall score exists (quick-score or
 * legacy rows), fill all axes with overall so the radar is a balanced pentagon.
 * Nullish individual values also fall back to overall; intentional 0s are kept
 * when at least one other axis is non-zero.
 */
export function normalizeRadarAxes(
  axes: Partial<RadarAxisScores> | null | undefined,
  overallScore: number,
): RadarAxisScores {
  const overall = clampScore(overallScore)
  const read = (v: number | null | undefined): number | null => {
    if (v == null || !Number.isFinite(Number(v))) return null
    return clampScore(Number(v))
  }
  const emotionalRangeDepth = read(axes?.emotionalRangeDepth)
  const characterBelievability = read(axes?.characterBelievability)
  const technicalSkill = read(axes?.technicalSkill)
  const screenPresence = read(axes?.screenPresence)
  const chemistryInteraction = read(axes?.chemistryInteraction)
  const resolved = [
    emotionalRangeDepth,
    characterBelievability,
    technicalSkill,
    screenPresence,
    chemistryInteraction,
  ]
  const allMissingOrZero = resolved.every((v) => v == null || v === 0)
  if (allMissingOrZero && overall > 0) {
    return {
      emotionalRangeDepth: overall,
      characterBelievability: overall,
      technicalSkill: overall,
      screenPresence: overall,
      chemistryInteraction: overall,
    }
  }
  return {
    emotionalRangeDepth: emotionalRangeDepth ?? overall,
    characterBelievability: characterBelievability ?? overall,
    technicalSkill: technicalSkill ?? overall,
    screenPresence: screenPresence ?? overall,
    chemistryInteraction: chemistryInteraction ?? overall,
  }
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
  const t = -Math.PI / 2 + (index * 2 * Math.PI) / 5
  const r = (clampScore(value) / 100) * maxR
  return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) }
}

function gridRing(level: number, cx: number, cy: number, maxR: number): string {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const p = radarPoint(i, level * 20, cx, cy, maxR)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  })
  return pts.join(" ")
}

/** Unit vector from radar center toward an axis tip. */
function axisUnit(
  index: number,
  cx: number,
  cy: number,
  maxR: number,
): { tip: { x: number; y: number }; ux: number; uy: number } {
  const tip = radarPoint(index, 100, cx, cy, maxR)
  const dx = tip.x - cx
  const dy = tip.y - cy
  const len = Math.hypot(dx, dy) || 1
  return { tip, ux: dx / len, uy: dy / len }
}

export function buildRadarCardSvg(input: RadarCardInput): string {
  const { width: w, height: h } = input
  const gold = "#FFD700"
  const goldLight = "#FFE55C"
  const isSquare = w === h || Math.abs(w - h) < 50

  const overallFromScore = clampScore(parseFloat(input.scoreOutOf10) * 10)
  const axes = normalizeRadarAxes(
    input.axes,
    overallFromScore ||
      clampScore(
        (input.axes.emotionalRangeDepth +
          input.axes.characterBelievability +
          input.axes.technicalSkill +
          input.axes.screenPresence +
          input.axes.chemistryInteraction) /
          5,
      ),
  )

  const values = [
    axes.emotionalRangeDepth,
    axes.characterBelievability,
    axes.screenPresence,
    axes.technicalSkill,
    axes.chemistryInteraction,
  ].map(clampScore)

  // Modest radar; labels sit outside along each spoke so they never cover the web.
  const cx = w / 2
  const cy = isSquare ? h * 0.58 : h * 0.58
  const maxR = isSquare ? Math.min(w, h) * 0.24 : Math.min(w, h) * 0.26

  const poly = values
    .map((v, i) => {
      const p = radarPoint(i, v, cx, cy, maxR)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(" ")

  // Spider web: outer ring strongest, inner rings still clearly visible.
  const rings = [1, 2, 3, 4, 5]
    .map((level) => {
      const isOuter = level === 5
      const stroke = isOuter ? "rgba(255,215,0,0.45)" : "rgba(255,255,255,0.28)"
      const sw = isOuter ? 2.25 : 1.5
      return `<polygon points="${gridRing(level, cx, cy, maxR)}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`
    })
    .join("\n  ")

  const spokeLines = values
    .map((_, i) => {
      const tip = radarPoint(i, 100, cx, cy, maxR)
      return `<line x1="${cx}" y1="${cy}" x2="${tip.x.toFixed(1)}" y2="${tip.y.toFixed(1)}" stroke="rgba(255,255,255,0.32)" stroke-width="1.5"/>`
    })
    .join("\n  ")

  // Soft gold wash under the web so spokes read against pure black.
  const webWash = `<polygon points="${gridRing(5, cx, cy, maxR)}" fill="rgba(255,215,0,0.06)" stroke="none"/>`

  const vertexDots = values
    .map((v, i) => {
      const p = radarPoint(i, v, cx, cy, maxR)
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isSquare ? 7 : 5.5}" fill="#0a0a0a" stroke="${gold}" stroke-width="2.5"/>`
    })
    .join("\n  ")

  const labelFont = isSquare ? 24 : 18
  const axisScoreFont = isSquare ? 22 : 17
  const axisBubbleW = isSquare ? 72 : 58
  const axisBubbleH = isSquare ? 38 : 30
  const labelNodes = AXIS_LABELS.map((label, i) => {
    const { tip, ux, uy } = axisUnit(i, cx, cy, maxR)
    const scoreOutOf10 = (values[i]! / 10).toFixed(1)
    const sub = AXIS_SUBLABELS[i]
    const hasSub = Boolean(sub)

    // Place score bubble and name outside the tip along the spoke (never into the web).
    const isBottom = i === 2 || i === 3
    const isSide = i === 1 || i === 4 // Character Depth, Originality
    const bubbleDist = isSquare
      ? isBottom
        ? 42
        : isSide
          ? 40
          : 36
      : isBottom
        ? 34
        : isSide
          ? 32
          : 28
    // Side axes need extra label distance so two-line / single names clear the score pill.
    const labelDist = hasSub
      ? isSquare
        ? isBottom
          ? 112
          : isSide
            ? 128
            : 96
        : isBottom
          ? 90
          : isSide
            ? 104
            : 76
      : isSquare
        ? isBottom
          ? 96
          : isSide
            ? 118
            : 82
        : isBottom
          ? 78
          : isSide
            ? 96
            : 64
    const lineSpread = isSquare ? 15 : 12

    const bx = tip.x + ux * bubbleDist
    const by = tip.y + uy * bubbleDist
    const lx = tip.x + ux * labelDist
    const ly = tip.y + uy * labelDist
    // Always stack name lines top→bottom on screen so "Screen Presence" reads correctly.
    const l1x = lx
    const l1y = ly - lineSpread
    const l2x = lx
    const l2y = ly + lineSpread

    const bubbleX = bx - axisBubbleW / 2
    const bubbleY = by - axisBubbleH / 2

    const parts: string[] = []
    if (hasSub) {
      parts.push(
        `<text x="${l1x.toFixed(1)}" y="${l1y.toFixed(1)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${labelFont}" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`,
        `<text x="${l2x.toFixed(1)}" y="${l2y.toFixed(1)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${labelFont}" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">${escapeXml(sub)}</text>`,
      )
    } else {
      parts.push(
        `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${labelFont}" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`,
      )
    }
    parts.push(
      `<rect x="${bubbleX.toFixed(1)}" y="${bubbleY.toFixed(1)}" width="${axisBubbleW}" height="${axisBubbleH}" rx="${axisBubbleH / 2}" fill="rgba(255,215,0,0.16)" stroke="${gold}" stroke-width="1.75"/>`,
      `<text x="${bx.toFixed(1)}" y="${by.toFixed(1)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${axisScoreFont}" font-weight="800" fill="${gold}" text-anchor="middle" dominant-baseline="central">${scoreOutOf10}</text>`,
    )
    return parts.join("\n  ")
  }).join("\n  ")

  const titleLine = input.actorName
  const movieLine = input.movieYear
    ? `in ${input.movieTitle} (${input.movieYear})`
    : `in ${input.movieTitle}`

  const handle = input.username.startsWith("@")
    ? input.username
    : `@${input.username}`

  const quote = input.quote?.trim()
    ? truncate(input.quote.trim(), isSquare ? 110 : 80)
    : null

  const headerY = isSquare ? 48 : 36
  const titleY = isSquare ? 92 : 70
  const movieY = isSquare ? 124 : 96
  const scoreBadgeY = isSquare ? h - 80 : h - 56
  const quoteY = isSquare ? h - 148 : h - 100
  const footerY = isSquare ? h - 28 : h - 18
  const badgeW = isSquare ? 280 : 220
  const badgeH = isSquare ? 72 : 56
  const badgeX = cx - badgeW / 2
  const badgeY = scoreBadgeY - badgeH / 2
  const totalScoreFont = isSquare ? 36 : 28

  // Small uncropped vertical portrait at radar center (2:3).
  const photoW = isSquare ? Math.round(maxR * 0.36) : Math.round(maxR * 0.34)
  const photoH = Math.round(photoW * 1.5)
  const photoX = cx - photoW / 2
  const photoY = cy - photoH / 2
  const photoHref = input.actorImageUrl?.trim() || null
  const photoNode = photoHref
    ? `<g>
  <rect x="${photoX.toFixed(1)}" y="${photoY.toFixed(1)}" width="${photoW}" height="${photoH}" rx="6" fill="#0a0a0a" stroke="${gold}" stroke-width="2"/>
  <image href="${escapeXml(photoHref)}" xlink:href="${escapeXml(photoHref)}" x="${photoX.toFixed(1)}" y="${photoY.toFixed(1)}" width="${photoW}" height="${photoH}" preserveAspectRatio="xMidYMid meet" clip-path="url(#actorPhotoClip)"/>
  <rect x="${photoX.toFixed(1)}" y="${photoY.toFixed(1)}" width="${photoW}" height="${photoH}" rx="6" fill="none" stroke="${gold}" stroke-width="2"/>
</g>`
    : ""

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${goldLight};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${gold};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${goldLight};stop-opacity:0.35" />
      <stop offset="100%" style="stop-color:#FFA500;stop-opacity:0.12" />
    </linearGradient>
    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="cardVignette" cx="50%" cy="48%" r="65%">
      <stop offset="0%" style="stop-color:#141414;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
    </radialGradient>
    <clipPath id="actorPhotoClip">
      <rect x="${photoX.toFixed(1)}" y="${photoY.toFixed(1)}" width="${photoW}" height="${photoH}" rx="6"/>
    </clipPath>
  </defs>
  <rect width="100%" height="100%" fill="url(#cardVignette)"/>
  <text x="48" y="${headerY}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${isSquare ? 24 : 20}" font-weight="700" fill="url(#goldGradient)">ActorRating.com</text>
  <text x="${w - 48}" y="${headerY}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${isSquare ? 20 : 17}" fill="rgba(255,255,255,0.7)" text-anchor="end">${escapeXml(handle)}</text>
  <text x="${cx}" y="${titleY}" font-family="Georgia, serif" font-size="${isSquare ? 34 : 26}" font-weight="700" fill="#FFFFFF" text-anchor="middle">${escapeXml(truncate(titleLine, 44))}</text>
  <text x="${cx}" y="${movieY}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${isSquare ? 20 : 16}" fill="${gold}" text-anchor="middle">${escapeXml(truncate(movieLine, 50))}</text>
  ${webWash}
  ${rings}
  ${spokeLines}
  <polygon points="${poly}" fill="url(#radarFill)" stroke="${gold}" stroke-width="${isSquare ? 3.5 : 2.75}" stroke-linejoin="round" filter="url(#softGlow)"/>
  ${photoNode}
  ${vertexDots}
  ${labelNodes}
  <rect x="${badgeX.toFixed(1)}" y="${badgeY.toFixed(1)}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="rgba(255,215,0,0.12)" stroke="${gold}" stroke-width="1.5"/>
  <text x="${cx}" y="${(scoreBadgeY + (isSquare ? 11 : 8)).toFixed(1)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${totalScoreFont}" font-weight="800" fill="url(#goldGradient)" text-anchor="middle">${escapeXml(input.scoreOutOf10)} / 10</text>
  ${
    quote
      ? `<text x="${cx}" y="${quoteY}" font-family="Georgia, serif" font-size="${isSquare ? 20 : 16}" font-style="italic" fill="rgba(255,255,255,0.75)" text-anchor="middle">“${escapeXml(quote)}”</text>`
      : ""
  }
  <text x="${cx}" y="${footerY}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" fill="rgba(255,255,255,0.45)" text-anchor="middle">actorrating.com</text>
</svg>`
}
