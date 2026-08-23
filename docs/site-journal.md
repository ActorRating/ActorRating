# Site journal (Stories + News)

## Content sources

1. **Markdown** in `content/stories/*.md` and `content/news/*.md` (hand-authored; deployed with the app)
2. **Database** `SiteEditorial` rows (daily cron + future admin tools)

`load-editorial.ts` merges both. File slugs win on collision.

## Frontmatter (markdown)

```yaml
title: string
description: string
publishedAt: YYYY-MM-DD
coverImage: optional URL
related:
  - actorSlug: ...
    movieSlug: ...
```

## Daily cron (on by default)

Coolify scheduled task (daily, e.g. 05:00 UTC):

```bash
node scripts/run-site-journal-cron.js
```

Or:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://actorrating.com/api/cron/site-journal
```

Each run publishes **1 Story** (random logged-in-rated performance craft pulse) + **1 News** (rotating journal topic) unless today’s slugs already exist.

Minimum length targets: **220+ words** for stories, **180+ words** for news. Daily news includes a poster from a rated performance when available.

**Covers:** index pages assign one **unique, relevant** movie poster per card (related performance first, then topic frontmatter). Daily cron skips posters already used on that rail. Blocklisted NSFW TMDB paths are rejected.

Disable with `SITE_JOURNAL_CRON_ENABLED=false`.

Requires migration: `SiteEditorial` (`prisma migrate deploy`).

## Gap-fill seed

```bash
npx tsx scripts/seed-journal-gap-fill.ts
```

Writes timed pieces across the Jul 29 → Aug 23 2026 gap (skips existing files).
