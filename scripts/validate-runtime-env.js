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
    `DATABASE_URL must start with postgres:// or postgresql://. Current protocol: ${parsed.protocol}`
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

console.log("[startup-env-check] DATABASE_URL validation passed.")
