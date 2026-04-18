/**
 * Development authentication bypass
 * Only works in development mode when NEXT_PUBLIC_DEV_MODE=true
 */

import type { Session } from "next-auth"

export const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true' && process.env.NODE_ENV === 'development'

export function buildDevNextAuthSession(): Session | null {
  if (!isDevMode) return null
  const u = getDevUser()
  if (!u) return null
  return {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    user: {
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name,
    },
  }
}

export const getDevUser = () => {
  if (!isDevMode) return null
  
  // Return a mock user object compatible with app session shape
  return {
    id: 'dev-user-id',
    email: 'dev@actorrating.com',
    user_metadata: {
      name: 'Dev User'
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  }
}

export const getDevSession = () => {
  if (!isDevMode) return null
  
  return {
    access_token: 'dev-token',
    refresh_token: 'dev-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: getDevUser()
  }
}
