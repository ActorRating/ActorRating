# ARIE status — Architecture frozen (pre–Sprint 3)

**Effective:** 2026-08-11  
**Architecture:** **FROZEN** — next phase is measurement / validation, not more coding.

## Surfaces (keep separate)

| Route | Role |
| --- | --- |
| `/admin/arie` | Reply evaluation / intelligence |
| `/admin/arie/originals` | Production original-content pipeline |
| `/admin/arie/intelligence` | Daily Intelligence — ranked original candidates |
| `/admin/arie/discovery` | Discovery Engine health + sources (V1, off by default) |
| `/admin/arie/validation` | Scientific validation batches (immutable) |

Sprint 3 has **not** started.

## Publish kill switches (server env only)

| Flag | Default |
| --- | --- |
| `ARIE_PUBLISH_ENABLED` | **false** |
| `ARIE_ORIGINAL_PUBLISH_ENABLED` | **false** |
| `ARIE_AUTO_PUBLISH_ENABLED` | **false** |
| `ARIE_DISCOVERY_ENABLED` | **false** |

Discovery V1 is implemented but **off by default**. See [DISCOVERY.md](./DISCOVERY.md). Publishing remains disabled. No reply automation. No browser/X bypass.

UI/API request bodies cannot override publish flags. Publisher is the only X write path (`postReplyTweet` / `postOriginalTweet`).

## Validation

- Does **not** publish.
- Uses `dedupeNamespace` (`val:{batchId}`) so evaluation does not collide with production opportunity keys.
- Freezes corpus snapshot, ARIE/prompt/constitution/prediction versions, pipeline results, grades, and aggregate metrics per batch.

## Milestone included

Sprint 1 infrastructure · Sprint 2 deterministic pipeline · reply eval tooling · Sprint 2.5 provenance · Originals A–D · measurement hardening · immutable validation batches · curated `originals-v1` regression corpus (incl. Tobey/BoinkBuzz/Iron Spider).

## Next human action

Deploy → migrate → open `/admin/arie/validation` → run `originals-v1` → upload the first real ~100-post corpus.

Docs: [ORIGINALS.md](./ORIGINALS.md) · [VALIDATION_BATCHES.md](./VALIDATION_BATCHES.md) · [SOFT_LAUNCH.md](./SOFT_LAUNCH.md) · [BRAND_CONSTITUTION.md](./BRAND_CONSTITUTION.md)
