import { redirect } from "next/navigation"

type PageProps = {
  searchParams: Promise<{ verified?: string }>
}

export default async function LoginRedirectPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = sp.verified === "true" ? "?verified=true" : ""
  redirect(`/auth/signin${q}`)
}
