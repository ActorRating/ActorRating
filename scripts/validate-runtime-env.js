#!/usr/bin/env node

function fail(message) {
  console.error(`[startup-env-check] ${message}`)
  process.exit(1)
}

const rawDatabaseUrl = process.env.DATABASE_URL

if (!rawDatabaseUrl || rawDatabaseUrl.trim().length === 0) {
  fail("DATABASE_URL is missing. Set it in your deployment environment before starting the app.")
}

let parsed
try {
  parsed = new URL(rawDatabaseUrl)
} catch {
  fail("DATABASE_URL is not a valid URL. Expected a PostgreSQL connection string.")
}

if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
  fail(
    `DATABASE_URL must start with postgres:// or postgresql://. Current protocol: ${parsed.protocol}`,
  )
}

if (!parsed.hostname) {
  fail("DATABASE_URL is invalid: hostname is missing.")
}

if (!parsed.pathname || parsed.pathname === "/") {
  fail("DATABASE_URL is invalid: database name is missing in path segment.")
}

if (!parsed.username) {
  fail("DATABASE_URL is invalid: username is missing.")
}

const authSecret =
  (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "").trim()
if (!authSecret) {
  fail("AUTH_SECRET or NEXTAUTH_SECRET is required for NextAuth.")
}

const authUrl = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "").trim()
if (!authUrl) {
  fail("AUTH_URL or NEXTAUTH_URL is required (canonical site URL for OAuth callbacks).")
}

if (process.env.NODE_ENV === "production") {
  const emailServer = (process.env.AUTH_EMAIL_SERVER || process.env.EMAIL_SERVER || "").trim()
  const emailFrom = (process.env.AUTH_EMAIL_FROM || process.env.EMAIL_FROM || "").trim()
  if (!emailServer || !emailFrom) {
    fail(
      "AUTH_EMAIL_SERVER (or EMAIL_SERVER) and AUTH_EMAIL_FROM (or EMAIL_FROM) are required for magic-link email auth in production.",
    )
  }

  const googleEnabled = (process.env.NEXT_PUBLIC_GOOGLE_OAUTH_AVAILABLE || "").trim() === "1"
  if (googleEnabled) {
    const gid = (process.env.GOOGLE_CLIENT_ID || "").trim()
    const gsec = (process.env.GOOGLE_CLIENT_SECRET || "").trim()
    if (!gid || !gsec) {
      fail(
        "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required when NEXT_PUBLIC_GOOGLE_OAUTH_AVAILABLE=1.",
      )
    }
  }
}

console.log("[startup-env-check] Core auth and database environment validation passed.")
