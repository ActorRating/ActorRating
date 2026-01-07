/**
 * Silent content validator for admin warnings.
 * 
 * This does NOT block content - it only flags suspicious patterns
 * for admin review. Non-blocking warnings only.
 */

export interface ContentWarning {
  level: 'warning' | 'info';
  message: string;
  pattern: string;
}

/**
 * Checks for suspicious patterns in movie titles/overviews.
 * Returns warnings (non-blocking) for admin review.
 */
export function validateContent(
  title: string,
  overview?: string | null
): ContentWarning[] {
  const warnings: ContentWarning[] = [];
  
  if (!title) return warnings;

  const titleLower = title.toLowerCase().trim();
  const overviewLower = (overview || '').toLowerCase().trim();
  const searchText = `${titleLower} ${overviewLower}`;

  // Suspicious patterns that should trigger warnings
  const suspiciousPatterns = [
    {
      pattern: /\bbest\s+of\b/i,
      message: 'Contains "Best of" - may be a compilation',
      level: 'warning' as const,
    },
    {
      pattern: /\bcompilation\b/i,
      message: 'Contains "Compilation" - may be repackaged content',
      level: 'warning' as const,
    },
    {
      pattern: /\bbloopers?\b/i,
      message: 'Contains "Bloopers" - not a performance',
      level: 'warning' as const,
    },
    {
      pattern: /\blive\s+(at|from|concert|performance)\b/i,
      message: 'Contains "Live" - may be a concert recording',
      level: 'warning' as const,
    },
    {
      pattern: /\bbehind\s+the\s+scenes\b/i,
      message: 'Contains "Behind the Scenes" - meta content',
      level: 'warning' as const,
    },
    {
      pattern: /\b(dvd|blu.?ray)\s+(collection|set|volume)\b/i,
      message: 'Contains DVD/Blu-ray collection - may be repackaged',
      level: 'warning' as const,
    },
    {
      pattern: /\bvolume\s+\d+\b/i,
      message: 'Contains "Volume" - may be part of a collection',
      level: 'info' as const,
    },
    {
      pattern: /\bmaking\s+of\b/i,
      message: 'Contains "Making of" - may be a documentary',
      level: 'warning' as const,
    },
    {
      pattern: /\bspecial\s+(edition|collection|set)\b/i,
      message: 'Contains "Special Edition/Collection" - verify standalone film',
      level: 'info' as const,
    },
  ];

  for (const { pattern, message, level } of suspiciousPatterns) {
    if (pattern.test(searchText)) {
      warnings.push({
        level,
        message,
        pattern: pattern.toString(),
      });
    }
  }

  return warnings;
}

