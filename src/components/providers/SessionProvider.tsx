"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import {
  SessionProvider as NextAuthSessionProvider,
  useSession as useNextAuthSession,
} from "next-auth/react"
import type { Session } from "next-auth"

type SessionContextValue = {
  session: Session | null
  user: Session["user"] | null
  loading: boolean
  isInitialized: boolean
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

function SessionBridge({ children }: { children: ReactNode }) {
  const { data: session, status } = useNextAuthSession()
  const loading = status === "loading"
  const isInitialized = status !== "loading"
  const value = useMemo(
    () => ({
      session: session ?? null,
      user: session?.user ?? null,
      loading,
      isInitialized,
    }),
    [session, loading, isInitialized]
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function SessionProvider({
  children,
  session,
}: {
  children: ReactNode
  session: Session | null
}) {
  // Pass `undefined` (not `null`) when there is no known SSR session.
  // NextAuth treats `null` as a confirmed "no session" (status = "unauthenticated")
  // which skips the loading phase. `undefined` tells it to fetch /api/auth/session
  // on mount and go through the proper "loading" → "authenticated/unauthenticated"
  // transition, preventing premature redirect decisions.
  return (
    <NextAuthSessionProvider session={session ?? undefined}>
      <SessionBridge>{children}</SessionBridge>
    </NextAuthSessionProvider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider")
  }
  return ctx
}

export function useUser() {
  return useSession().user
}
