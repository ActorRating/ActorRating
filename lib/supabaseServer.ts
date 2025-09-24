import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export function createServerSupabase(req, res) {
  return createServerSupabaseClient({ req, res })
}


