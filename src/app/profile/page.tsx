import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { resolveUser } from '@/lib/auth/resolveUser'
import ProfileClient from './ProfileClient'

// User-specific — must remain dynamic.
export const dynamic = 'force-dynamic'

/**
 * Profile page — server-authoritative access control.
 *
 * Middleware already blocks unauthenticated requests to /profile/* before this
 * component runs.  The auth() + resolveUser() call here is the server truth layer
 * that also handles the onboarding gate and any cookie-propagation edge cases.
 *
 * Pattern is intentionally identical to /dashboard/page.tsx.
 */
export default async function ProfilePage() {
  const session = await auth()
  const result = await resolveUser(session)

  // Middleware guards /profile — this is a deterministic safety valve, not the
  // primary auth gate.  Unauthenticated slip-throughs always go to sign-in.
  if (result.status !== 'authenticated') {
    redirect('/auth/signin')
  }

  // If the user hasn't finished onboarding yet, send them there first.
  if (result.needsOnboarding) {
    redirect('/onboarding')
  }

  return (
    <ProfileClient
      initialProfile={{
        email: result.user.email ?? '',
      }}
    />
  )
}
