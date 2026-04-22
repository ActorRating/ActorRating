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

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `npm run build` runs `prisma generate && next build` (see package.json)
RUN npm run build

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

USER nextjs

EXPOSE 3000

# Do NOT use `next start` or `npm start` here: run the standalone `server.js`
# generated under `.next/standalone` (copied to WORKDIR root above).
CMD ["node", "server.js"]
