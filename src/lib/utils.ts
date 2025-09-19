import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
//

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a unique username for Google OAuth users
 * @param baseName - The base name to use (usually from Google profile)
 * @returns A unique username
 */
// Username generation removed in simplified auth model