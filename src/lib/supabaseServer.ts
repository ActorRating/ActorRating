import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let serviceRoleClient: SupabaseClient | null = null

/**
 * Admin/server-only client (service role). Call inside handlers, not at module scope.
 */
export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (serviceRoleClient) {
    return serviceRoleClient
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Supabase env vars are missing")
  }
  serviceRoleClient = createClient(url, key)
  return serviceRoleClient
}
