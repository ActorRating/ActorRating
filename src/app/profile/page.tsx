import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/serverAuth'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getServerUser()
  if (!user) {
    redirect('/auth/signin')
  }
  return (
    <ProfileClient
      initialProfile={{
        email: user.email ?? '',
      }}
    />
  )
}
