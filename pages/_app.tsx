import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from '../lib/supabaseClient'
import '../styles/globals.css'
import type { AppProps } from 'next/app'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={pageProps.initialSession}>
      <Component {...pageProps} />
    </SessionContextProvider>
  )
}

export default MyApp


