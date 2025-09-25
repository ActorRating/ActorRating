import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

export function createServerSupabase(req: NextApiRequest, res: NextApiResponse) {
  return createServerSupabaseClient({ req, res })
}


