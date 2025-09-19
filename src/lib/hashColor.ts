/**
 * Deterministic color from string. Returns an HSL-based hex.
 */
export function hashColor(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  const saturation = 65
  const lightness = 55
  return hslToHex(hue, saturation, lightness)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const C = (1 - Math.abs(2 * l - 1)) * s
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - C / 2
  let r = 0, g = 0, b = 0
  if (0 <= h && h < 60) { r = C; g = X; b = 0 }
  else if (60 <= h && h < 120) { r = X; g = C; b = 0 }
  else if (120 <= h && h < 180) { r = 0; g = C; b = X }
  else if (180 <= h && h < 240) { r = 0; g = X; b = C }
  else if (240 <= h && h < 300) { r = X; g = 0; b = C }
  else { r = C; g = 0; b = X }
  const toHex = (v: number) => {
    const n = Math.round((v + m) * 255)
    return n.toString(16).padStart(2, '0')
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

