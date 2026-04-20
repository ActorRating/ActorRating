# Auth Migration Plan (Supabase -> Prisma)

This app now uses NextAuth + Prisma. To protect production data, migrations are phased and non-destructive.

## 1) Build Safety

- Docker image build **must not** mutate schema.
- `Dockerfile` includes only:
  - dependency install
  - `prisma generate`
  - `next build`
- No `prisma db push` or `prisma migrate deploy` runs during image build.

## 2) Deploy Safety

Run migrations in a dedicated deploy step (or release command), never in Docker build:

```bash
npm run db:deploy
```

## 3) Transitional Schema Safety

`Performance.userId` and `Rating.userId` are nullable during migration.

Why:

- existing rows may reference identities not yet mapped into `public.User`
- avoids failing deploys due to required relation backfills

After full backfill and validation, tighten constraints in a later migration.

## 4) Supabase User Backfill

Run once (or idempotently) against production DB:

```bash
npm run db:migrate-supabase-users
```

This script inserts users from `auth.users` into `public.User` when no matching email/id exists.

## 5) Runtime Fallback (Recommended)

Keep first-login fallback behavior:

- if authenticated user/email is missing from `public.User`, create the row on first successful auth.

This ensures no user is blocked if they were missed in backfill.
