export interface CharacterResolvable {
  character?: string | null
  roleName?: string | null
  comment?: string | null
}

/**
 * Resolve a human-friendly character display string for a performance.
 * Order of precedence:
 * 1) Stored Performance.character (if non-empty and not "Unknown")
 * 2) Aggregated/direct Rating.roleName (if non-empty)
 * 3) Parsed from Performance.comment (supports prefixes like "Character:" or "as ...")
 * 4) Fallback to "Unknown"
 */
export function resolveCharacterDisplay(source: CharacterResolvable): string {
  const val = (source.character ?? '').trim()
  if (val && val.toLowerCase() !== 'unknown') return val

  const role = (source.roleName ?? '').trim()
  if (role) return role

  const raw = source.comment ?? ''
  if (raw) {
    // Strip any trailing director annotation like ", Director: ..."
    let t = raw.split(/,\s*Director:/i)[0]
    // Remove leading "Character:" or "Character -" or similar
    t = t.replace(/^\s*(Character\s*[:\-]\s*)/i, '')
    // Remove leading "as "
    t = t.replace(/^\s*as\s+/i, '')
    // Trim quotes
    t = t.replace(/^"|"$/g, '')
    t = t.trim()
    if (t) return t
  }

  return 'Unknown'
}


