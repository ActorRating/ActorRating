"use client"

import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { supabase } from "../../../lib/supabaseClient"
import { ReactNode } from "react"

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <UserProvider supabaseClient={supabase}>
      {children}
    </UserProvider>
  )
}