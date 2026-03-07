import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isJunkMovieSlug } from "@/lib/junk-movie-slugs"

// Placeholder/junk movie slugs: -YEAR-id (e.g. -2021-2s5jgim7, -2025-qmc9o4xt)
const JUNK_MOVIE_SLUG_REGEX = /^-?\d{4}-[a-z0-9]+$/i

export async function middleware(req: NextRequest) {
  // Allow all /actors/[id] requests through. The page loads and the API (or client fetch)
  // checks if the actor exists; if not, the API returns 410 and the page shows not-found.

  // Return 410 only for known junk/placeholder movie slugs (no API call).
  // All other /movies/[slug] requests go through; the page/API returns 410/404 if not found.
  const movieMatch = req.nextUrl.pathname.match(/^\/movies\/([^/]+)\/?$/)
  if (movieMatch) {
    const [, slug] = movieMatch
    if (slug && (JUNK_MOVIE_SLUG_REGEX.test(slug) || isJunkMovieSlug(slug))) {
      return new NextResponse(null, {
        status: 410,
        headers: { "Cache-Control": "public, max-age=86400" },
      })
    }
  }

  // /rate/[movieSlug]/[actorSlug] is NOT in the matcher — so middleware never runs for it.
  // That allows ISR (x-vercel-cache: HIT). The page returns 410 when movie/actor not found.

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Development mode: bypass auth checks
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true' && process.env.NODE_ENV === 'development'
  
  if (isDevMode && req.nextUrl.pathname.startsWith('/dashboard')) {
    // Allow access to dashboard in dev mode
    return response
  }
  
  // Validate the JWT with Supabase (getUser), not just read cookie (getSession).
  // This prevents invalid/expired tokens from reaching the dashboard and causing Server Component errors.
  const { data: { user }, error } = await supabase.auth.getUser()

  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (error || !user) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && (req.nextUrl.pathname.startsWith('/auth/signin') || req.nextUrl.pathname.startsWith('/auth/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return response
}

export const config = {
  matcher: [
    "/actors/:id*",
    "/movies/:slug*",
    "/dashboard/:path*",
    "/auth/signin",
    "/auth/signup",
  ],
}
