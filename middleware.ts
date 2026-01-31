import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function middleware(req: NextRequest) {
  // Return 410 Gone for /actors/[id] when actor no longer exists
  const actorMatch = req.nextUrl.pathname.match(/^\/actors\/([^/]+)\/?$/)
  if (actorMatch) {
    const [, id] = actorMatch
    if (id && UUID_REGEX.test(id)) {
      return new NextResponse(null, {
        status: 410,
        headers: { "Cache-Control": "public, max-age=86400" },
      })
    }
    if (id) {
      try {
        const res = await fetch(
          `${req.nextUrl.origin}/api/actors/${encodeURIComponent(id)}`,
          { headers: { "Content-Type": "application/json" }, next: { revalidate: 0 } }
        )
        if (!res.ok) {
          return new NextResponse(null, {
            status: 410,
            headers: { "Cache-Control": "public, max-age=86400" },
          })
        }
      } catch {
        // On fetch error, continue to page (let client handle)
      }
    }
  }

  // Return 410 Gone for /rate/[movieSlug]/[actorSlug] when actor or movie no longer exists
  const rateMatch = req.nextUrl.pathname.match(/^\/rate\/([^/]+)\/([^/]+)\/?$/)
  if (rateMatch) {
    const [, movieSlug, actorSlug] = rateMatch
    const origin = req.nextUrl.origin
    try {
      const [actorRes, movieRes] = await Promise.all([
        fetch(`${origin}/api/actors/${encodeURIComponent(actorSlug)}`, {
          headers: { "Content-Type": "application/json" },
          next: { revalidate: 0 },
        }),
        fetch(`${origin}/api/movies/${encodeURIComponent(movieSlug)}`, {
          headers: { "Content-Type": "application/json" },
          next: { revalidate: 0 },
        }),
      ])
      if (!actorRes.ok || !movieRes.ok) {
        return new NextResponse(null, {
          status: 410,
          headers: { "Cache-Control": "public, max-age=86400" },
        })
      }
    } catch {
      // On fetch error, continue to page (let it handle 410)
    }
  }

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
  
  // Get the session and validate it
  const { data: { session }, error } = await supabase.auth.getSession()
  
  // If there's an error or no session, and the user is trying to access protected routes
  if ((error || !session) && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (session && (req.nextUrl.pathname.startsWith('/auth/signin') || req.nextUrl.pathname.startsWith('/auth/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return response
}

export const config = {
  matcher: [
    "/actors/:id*",
    "/rate/:movieSlug/:actorSlug",
    "/dashboard/:path*",
    "/auth/signin",
    "/auth/signup",
  ],
}
