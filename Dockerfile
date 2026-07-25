# syntax=docker/dockerfile:1
#
# Next.js "standalone" output bundles the minimal server and traced dependencies
# into `.next/standalone/`. You MUST run that entrypoint.
#
# Using `next start` (or a misaligned cwd) in Docker often serves a different
# process layout than the standalone bundle, which can break Set-Cookie behavior
# and leave sessions looking "logged out" after redirect (NextAuth appears to
# succeed then immediately bounces to /auth/signin).
#
# Runtime env (NEXTAUTH_URL, NEXTAUTH_SECRET, DATABASE_URL, etc.) is injected by
# Coolify / your orchestrator—do not bake secrets into this image.

# ------------ Dependencies (reproducible install layer) ------------
FROM node:20-alpine AS deps
WORKDIR /app

# Install OS deps only if you add native modules later; keep image minimal

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ------------ Build application + standalone bundle ------------
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Coolify injects runtime DATABASE_URL at build time; skip Prisma I/O so `next build` cannot hang on an unreachable host.
ENV SKIP_BUILD_TIME_DB=1
# Reduce OOM kills (exit 255) during webpack compile on small build runners.
ENV NODE_OPTIONS=--max-old-space-size=6144

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `npm run build` runs `prisma generate && next build` (see package.json)
RUN npm run build

# Bundle ops scripts into single Node.js files so the runner image can execute
# them with plain `node` (no tsx / full node_modules / app TypeScript sources).
# @prisma/client is externalised because it already lives in the standalone output.
RUN ./node_modules/.bin/esbuild scripts/generate-sitemaps.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --external:@prisma/client \
    --outfile=scripts/generate-sitemaps.js
RUN ./node_modules/.bin/esbuild scripts/ingest-all-movies-cast.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --external:@prisma/client \
    --alias:@=./src \
    --outfile=scripts/ingest-all-movies-cast.js

# ------------ Production runner (no full app source, no `npm` start) ------------
FROM node:20-alpine AS runner
WORKDIR /app

# Prisma engine + some native Node addons expect OpenSSL on Alpine
RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next standalone server default; Coolify can override with PORT
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy the traced standalone server (includes minimal node_modules for traced deps e.g. Prisma)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets must sit next to the server bundle
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Public files (favicon, etc.) — not included inside standalone
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma schema + migrations (needed by Prisma client at runtime for schema introspection)
COPY --from=builder /app/prisma ./prisma
# Curated listicle markdown (read at runtime by /lists routes + sitemap generator)
COPY --from=builder --chown=nextjs:nodejs /app/content ./content

# Bundled sitemap generator — runs at container start via docker-entrypoint.sh.
# Cast ingest is optional (Coolify Terminal): `node scripts/ingest-all-movies-cast.js`
# @prisma/client is resolved from the standalone node_modules already present at /app/node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/generate-sitemaps.js ./scripts/generate-sitemaps.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/ingest-all-movies-cast.js ./scripts/ingest-all-movies-cast.js

# Writable dirs for atomic sitemap publish (live + temp during generation).
RUN mkdir -p /app/public/sitemaps /app/public/sitemaps-temp && chown -R nextjs:nodejs /app/public/sitemaps /app/public/sitemaps-temp

# Entrypoint: synchronous sitemap generation (atomic publish) before Next.js binds.
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

# Do NOT use `next start` or `npm start` here: run the standalone `server.js`
# generated under `.next/standalone` (copied to WORKDIR root above).
#
# DB migrations are NOT run here — the standalone runner image is intentionally
# minimal and does not include the Prisma CLI or @prisma/engines (~100 MB).
# Run `npx prisma migrate deploy` as a separate pre-deploy step in Coolify
# (Lifecycle Hook → Before Start), or apply migrations manually via the
# Supabase SQL editor before deploying a schema change.
CMD ["./docker-entrypoint.sh"]
