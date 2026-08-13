# ARIE Discovery Engine V1

**Status:** V1 — implemented, disabled by default  
**Effective:** 2026-08-12

Discovery is the missing upstream half of ARIE. It finds candidate X posts and feeds the **existing** Scout → Opportunity → Context → Concepts → Writer → QA → Daily Intelligence pipeline.

Discovery does **not** decide final editorial quality. Scout remains the gate.

## Hardening (post-V1 review)

- **No heatHint from raw engagement** — velocity stays `unknown` without history
- **Retryable ingest** — `PENDING` / `INGESTING` / `INGESTED` / `ERROR` with lease; failures retry
- **One post → one inbound → ≤1 production original opportunity**
- **Observational health** — admin/dashboard never live-probes X (no 3-call probe)
- **Account timelines** — `exclude=replies,retweets`
- **Author handle fallback** from configured source account
- **Kill switch is real** — no `force=true` bypass of `ARIE_DISCOVERY_ENABLED`
- **DISABLED** status when flag off (not ERROR)
- Capability cache: `available` | `unavailable` | `unknown` (transient ≠ permanent)

## Architecture

```
X (read/search API)
    ↓
DiscoveryProvider (X v1)
    ↓
DiscoveryCandidate (dedupe: provider + externalPostId)
    ↓
ArieInboundEvent
    ↓
ingestOriginalOpportunity → Scout exclusions → Original Opportunity Score
    ↓
(existing downstream pipeline)
    ↓
/admin/arie/intelligence
```

## Provider abstraction

`DiscoveryProvider` interface (`src/lib/arie/discovery/types.ts`):

| Method | Purpose |
| --- | --- |
| `sourceName()` | Provider id (`X`) |
| `health()` | Capability probe + bearer status |
| `getPostsFromAccounts()` | Account timeline discovery |
| `searchPosts()` | Keyword/topic search |

Future providers (RSS, trade feeds) can implement the same interface. Only **X** is implemented in V1.

## X API capabilities used (read-only)

Discovery authenticates **GET** requests with, in order:

1. **OAuth 1.0a user context** — same four credentials Publisher already uses (`ARIE_X_API_KEY`, `ARIE_X_API_SECRET`, `ARIE_X_ACCESS_TOKEN`, `ARIE_X_ACCESS_SECRET`)
2. **Optional app-only Bearer** — `ARIE_X_BEARER_TOKEN` / `X_BEARER_TOKEN` if OAuth 1.0a is not configured

Bearer is **not required** when OAuth 1.0a user-context credentials are present.

| Endpoint | Capability | Auth |
| --- | --- | --- |
| `GET /2/users/by/username/:username` | User lookup | OAuth 1.0a or Bearer |
| `GET /2/users/:id/tweets` | Account timeline | OAuth 1.0a or Bearer |
| `GET /2/tweets/search/recent` | Recent search | OAuth 1.0a or Bearer |

**No write operations.** Discovery never calls `postReplyTweet`, `postOriginalTweet`, or Publisher. OAuth 1.0a is used for **read GET only** in this module.

If a capability is unavailable on the current X plan, the admin UI shows it as **blocked** — no workaround, no fake data.

## Configuration

### Environment (default safe)

| Variable | Default | Purpose |
| --- | --- | --- |
| `ARIE_DISCOVERY_ENABLED` | **false** | Master switch |
| `ARIE_DISCOVERY_MAX_CANDIDATES_PER_RUN` | 40 | Per-run candidate cap |
| `ARIE_DISCOVERY_MAX_SOURCES_PER_RUN` | 8 | Sources polled per run |
| `ARIE_DISCOVERY_LOOKBACK_MINUTES` | 120 | How far back to fetch |
| `ARIE_DISCOVERY_INTERVAL_MINUTES` | 10 | Documented scheduler interval |

Publishing flags remain independent and OFF by default:

- `ARIE_PUBLISH_ENABLED=false`
- `ARIE_ORIGINAL_PUBLISH_ENABLED=false`
- `ARIE_AUTO_PUBLISH_ENABLED=false`

### Source list

Default seeds: `docs/arie/discovery-sources.default.json`

Stored in `ArieDiscoverySource` (DB). Not hardcoded in business logic.

Each source supports: handle/query, enabled, priority, topic tags, poll interval, max candidates.

**Distribution priority ≠ factual reliability.** High-distribution aggregators are not marked “unreliable” globally — provenance decides claim confidence.

## Discovery priority vs Opportunity Score

| Signal | When | Uses Groq? |
| --- | --- | --- |
| `discoveryPriority` | Cheap candidate ordering before Scout | No |
| Original Opportunity Score | After Scout/context | No (deterministic) |

Discovery priority inputs: source priority, recency, engagement metrics, keyword relevance.

**Velocity:** `unknown` unless historical metric snapshots exist. Never fabricated as zero.

## Deduplication

Primary identity: **`provider + externalPostId`** (`ArieDiscoveryCandidate` unique constraint).

Production discovery is isolated from validation (`dedupeNamespace: val:{batchId}`).

Re-running discovery is idempotent: rediscovered posts update metadata, no duplicate inbound events.

## Discovery runs

`ArieDiscoveryRun` records: status (`SUCCESS`, `PARTIAL`, `RATE_LIMITED`, `ERROR`, `NO_RESULTS`), counts, errors, rate-limit info, capability snapshot.

A failed X request is **not** silently reported as “0 posts found.”

## Scheduling

Cron endpoint (CRON_SECRET auth):

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://actorrating.com/api/cron/arie-discovery
```

Recommended interval: every 5–10 minutes when enabled. Do not configure aggressive polling.

## Admin surface

`/admin/arie/discovery` — read-only health, sources, recent candidates, manual/force run.

No publish controls.

## Relationship to Daily Intelligence

`/admin/arie/intelligence` consumes opportunities created from discovered posts.

**Scanned** counter uses today's `ArieDiscoveryCandidate` count when discovery has run; otherwise falls back to opportunity count.

Human approve/edit/skip only — no auto-publish.

## Security

Discovery may: READ, SEARCH, DISCOVER, STORE, ANALYZE.

Discovery may not: REPLY, QUOTE, LIKE, FOLLOW, POST, DM.

Publisher remains the **only** X write path.

## Enable checklist

1. Apply migration `20260812140000_arie_discovery_engine`
2. Set `ARIE_X_BEARER_TOKEN` (read access)
3. Set `ARIE_DISCOVERY_ENABLED=true`
4. Schedule `/api/cron/arie-discovery` every 5–10 min
5. Verify capabilities on `/admin/arie/discovery`
6. Review candidates on `/admin/arie/intelligence`

## Limitations (V1)

- No browser automation or scraping
- No reply/quote automation
- No LLM during discovery
- Keyword search depends on X plan tier
- Metric velocity requires future snapshot storage

See also: [ORIGINALS.md](./ORIGINALS.md) · [STATUS.md](./STATUS.md)
