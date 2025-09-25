// This file is deprecated - using Supabase Auth instead of NextAuth
// Keeping minimal exports for any legacy compatibility

// Legacy auth helper functions (if needed for compatibility)
export const getServerSession = (...args: any[]): Promise<{user?: {id?: string}} | null> => {
  // NextAuth removed - returning null for compatibility
  return Promise.resolve(null)
}

// Placeholder for authOptions to prevent import errors
export const authOptions = {}

// All NextAuth configuration removed - now using Supabase Auth