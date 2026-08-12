# ARIE Original Content Engine

**Milestone:** A–D + Sprint 2.5 Truth / Provenance hardening  
**Status:** Ready for supervised experiment (auto-publish OFF)  
**Auto original publish:** OFF (`ARIE_ORIGINAL_PUBLISH_ENABLED=false` by default)  
**Master publish:** OFF (`ARIE_PUBLISH_ENABLED=false` by default)

## Discovery upstream (V1)

Production originals can enter via **Discovery Engine** (automatic) or manual admin ingest (validation/testing).

```
X read API → DiscoveryCandidate → ArieInboundEvent → ingestOriginalOpportunity
```

- Discovery: [DISCOVERY.md](./DISCOVERY.md)
- Default: `ARIE_DISCOVERY_ENABLED=false`
- Discovery priority ≠ Original Opportunity Score
- Daily Intelligence: `/admin/arie/intelligence`

## Measurement lineage

```
Inbound Event
→ Opportunity (contentType=original)
→ Original Opportunity Score
→ Context Package (+ claims / evidence / sourceProvenance)
→ Concepts + selected concept / format taxonomy
→ Writer + visual spec + prompt versions
→ Deterministic QA + Constitution + Semantic QA
→ Prediction snapshot (heuristic, versioned)
→ Human Approve
→ Publisher (idempotent lock)
→ ArieSocialPost (+ X id)
→ ArieMetricSnapshot (1h/6h/24h/72h/7d)
→ ActorRating attribution (utm_content=opportunityId)
```

## Sprint 2.5 — Provenance

**SOURCE CLAIM ≠ VERIFIED FACT.**

Context Package now includes:

- `claims[]` with status: VERIFIED | REPORTED | UNVERIFIED | CONTRADICTED | UNKNOWN
- `sourceProvenance` — `distributionPriority` and `reliabilityClass` are separate
- `evidence` — confirmed / reported / uncertain / contradicted + missingEvidence
- `factualConfidence` + `writerMode` (VERIFIED_EVENT | REPORTED_EVENT | DISCUSSION)

Writer prompts: `original-writer/v1.1.md` (v1.0 preserved).  
QA prompts: `original-qa/v1.1.md` (v1.0 preserved).  
Brand Constitution: v1.1.

Opportunity score and factual confidence remain independent dimensions.

## Validation batches (pre–Sprint 3)

Admin: [`/admin/arie/validation`](/admin/arie/validation)

Immutable runs:

```
Validation Batch
├── batch ID
├── corpus version (originals-v1 / upload:sha / hybrid)
├── ARIE/prompt versions (frozen at run)
├── source distribution
├── timestamp
├── pipeline results (every case)
├── sampled cases (edge / stratified subset)
├── human grades
└── aggregate metrics
```

Does **not** auto-publish. Does **not** change provenance or scoring weights. Production originals remain at `/admin/arie/originals`.

Prediction is **never** overwritten after `predictionLockedAt` (set on successful publish).

## Prediction

Deterministic heuristic `original-prediction@v1.0` — not ML.

Fields: `predictedScore`, `predictedTier`, factor map, coarse buckets for impressions / engagement / profile visits / AR clicks.  
`measurementDimensions` logs opportunity vs factual confidence / source classes for future analysis (does not change score weights).

## Metrics

`ArieSocialPost` holds latest nullable X + first-party metrics.  
`ArieMetricSnapshot` stores windowed trajectory. Admin:  
`POST /api/admin/arie/social-posts/:id/metrics`

## Attribution

```
utm_source=x&utm_medium=social&utm_campaign=arie_original&utm_content=<opportunityId>
```

## Kill switches

| Flag | Default |
| --- | --- |
| `ARIE_PUBLISH_ENABLED` | false |
| `ARIE_ORIGINAL_PUBLISH_ENABLED` | false |
| `ARIE_AUTO_PUBLISH_ENABLED` | false (originals reject AUTO) |

Both publish flags must be true for Approve & Post.

## Admin

- `/admin/arie` — replies  
- `/admin/arie/originals` — originals command center (score, prediction, concepts, QA, actual metrics)

## Migrations

1. `20260810120000_arie_original_content`  
2. `20260810140000_arie_originals_measurement`
