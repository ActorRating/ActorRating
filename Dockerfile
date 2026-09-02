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
# Cap Node heap so Coolify builds don't OOM the host (running app + build share RAM).
# Keep heap below host free RAM while the live app is still running; page-data
# workers are also capped via experimental.cpus=1 in next.config.js.
ENV NODE_OPTIONS=--max-old-space-size=3072

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
RUN ./node_modules/.bin/esbuild scripts/list-sitemap-indexable-performances.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --external:@prisma/client \
    --external:dotenv \
    --outfile=scripts/list-sitemap-indexable-performances.js
RUN ./node_modules/.bin/esbuild scripts/ingest-all-movies-cast.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --external:@prisma/client \
    --alias:@=./src \
    --outfile=scripts/ingest-all-movies-cast.js
RUN ./node_modules/.bin/esbuild scripts/backfill-internal-crawl-bots.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --external:@prisma/client \
    --alias:@=./src \
    --outfile=scripts/backfill-internal-crawl-bots.js
RUN ./node_modules/.bin/esbuild scripts/backfill-bot-category.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --external:@prisma/client \
    --alias:@=./src \
    --outfile=scripts/backfill-bot-category.js
RUN ./node_modules/.bin/esbuild scripts/seed-forum-threads.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --external:@prisma/client \
    --outfile=scripts/seed-forum-threads.js
RUN ./node_modules/.bin/esbuild scripts/seed-invite-codes.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --external:@prisma/client \
    --outfile=scripts/seed-invite-codes.js

# Stage Prisma CLI + transitive deps for the runner.
# Next standalone traces @prisma/client but not the `prisma` CLI package (never imported by the server).
RUN node scripts/docker-stage-prisma-cli.js /opt/prisma-cli/node_modules \
  && /opt/prisma-cli/node_modules/.bin/prisma -v

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
# ARIE Brand Constitution — loaded at runtime by preview draft / agents (not in standalone trace)
COPY --from=builder --chown=nextjs:nodejs /app/docs/arie/BRAND_CONSTITUTION.md ./docs/arie/BRAND_CONSTITUTION.md

# Bundled sitemap generator — runs at container start via docker-entrypoint.sh.
# Cast ingest is optional (Coolify Terminal): `node scripts/ingest-all-movies-cast.js`
# @prisma/client is resolved from the standalone node_modules already present at /app/node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/generate-sitemaps.js ./scripts/generate-sitemaps.js
# Diagnostic: `node scripts/list-sitemap-indexable-performances.js [--missing-from=URL]`
COPY --from=builder --chown=nextjs:nodejs /app/scripts/list-sitemap-indexable-performances.js ./scripts/list-sitemap-indexable-performances.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/ingest-all-movies-cast.js ./scripts/ingest-all-movies-cast.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/backfill-internal-crawl-bots.js ./scripts/backfill-internal-crawl-bots.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/backfill-bot-category.js ./scripts/backfill-bot-category.js
# Forum starter threads: `node scripts/seed-forum-threads.js` (or `npm run seed:forum`)
COPY --from=builder --chown=nextjs:nodejs /app/scripts/seed-forum-threads.js ./scripts/seed-forum-threads.js
# Bootstrap invites: `node scripts/seed-invite-codes.js` before INVITE_GATE_ENABLED=1
COPY --from=builder --chown=nextjs:nodejs /app/scripts/seed-invite-codes.js ./scripts/seed-invite-codes.js
# Coolify Scheduled Task: `node scripts/run-waitlist-invite-cron.js`
COPY --from=builder --chown=nextjs:nodejs /app/scripts/run-waitlist-invite-cron.js ./scripts/run-waitlist-invite-cron.js
# Coolify Scheduled Task: `node scripts/run-site-journal-cron.js` (daily stories + news)
COPY --from=builder --chown=nextjs:nodejs /app/scripts/run-site-journal-cron.js ./scripts/run-site-journal-cron.js
# Coolify Scheduled Task: `node scripts/run-performance-editorial-cron.js`
COPY --from=builder --chown=nextjs:nodejs /app/scripts/run-performance-editorial-cron.js ./scripts/run-performance-editorial-cron.js
# Coolify Scheduled Task (daily): `node scripts/run-generate-sitemaps-cron.js`
# Also runs on every container start via docker-entrypoint.sh — cron covers mid-deploy rating growth.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/run-generate-sitemaps-cron.js ./scripts/run-generate-sitemaps-cron.js

# Merge Prisma CLI into standalone node_modules (does not replace traced @prisma/client).
# Coolify pre-deploy hooks can then use: ./node_modules/.bin/prisma migrate deploy
COPY --from=builder /opt/prisma-cli/node_modules /tmp/prisma-cli-modules
RUN cp -a /tmp/prisma-cli-modules/. ./node_modules/ \
  && rm -rf /tmp/prisma-cli-modules \
  && mkdir -p ./node_modules/.bin \
  && ln -sfn ../prisma/build/index.js ./node_modules/.bin/prisma \
  && chown -R nextjs:nodejs ./node_modules \
  && test -d ./node_modules/prisma \
  && test -x ./node_modules/.bin/prisma \
  && ./node_modules/.bin/prisma -v

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
# Prisma CLI is installed at /app/node_modules/prisma (merged from the builder).
# DB migrations are NOT run on container start — Coolify remains responsible for
# `./node_modules/.bin/prisma migrate deploy` (or equivalent) as a pre-deploy step,
# or apply migrations manually via the Supabase SQL editor before deploying a schema change.
CMD ["./docker-entrypoint.sh"]
