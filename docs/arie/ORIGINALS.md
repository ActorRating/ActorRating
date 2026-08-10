# ARIE Original Content Engine

**Milestone:** A–D + pre-deploy measurement hardening  
**Status:** Ready for supervised experiment (auto-publish OFF)  
**Auto original publish:** OFF (`ARIE_ORIGINAL_PUBLISH_ENABLED=false` by default)  
**Master publish:** OFF (`ARIE_PUBLISH_ENABLED=false` by default)

## Measurement lineage

```
Inbound Event
→ Opportunity (contentType=original)
→ Original Opportunity Score
→ Context Package
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

Prediction is **never** overwritten after `predictionLockedAt` (set on successful publish).

## Prediction

Deterministic heuristic `original-prediction@v1.0` — not ML.

Fields: `predictedScore`, `predictedTier`, factor map, coarse buckets for impressions / engagement / profile visits / AR clicks.

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
