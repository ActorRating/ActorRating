# ARIE Originals — Validation batches

**UI:** `/admin/arie/validation`  
**Purpose:** Scientific comparison of ARIE originals versions on frozen corpora.  
**Publishing:** Never. Publish flags remain off.

This is separate from:

| Surface | Role |
| --- | --- |
| `/admin/arie` | Reply intelligence / evaluation |
| `/admin/arie/originals` | Production originals pipeline |
| `/admin/arie/validation` | Immutable evaluation environment |

## Create a batch

1. Optionally paste upload JSON (`[{ authorHandle, text, ... }]` or `{ items: [...] }`).
2. Toggle **Include originals-v1 seed fixtures** (regression set in `docs/arie/corpus/originals-v1.json`).
3. Choose `score_only` (ingest + score + evidence) or `full_pipeline` (+ concepts/draft/QA when eligible).
4. Create → corpus snapshot is **immutable**.

Re-running the same inputs later creates a **new** batch with a new `arieVersions` stamp so you can compare:

```text
ARIE 2.5 → same corpus → 82% A/B
ARIE 2.6 → same corpus → 91% A/B
```

## Run

- **Run next 5** / **Run all remaining** call existing `ingestOriginalOpportunity` (and optional stage runners).
- Validation uses a `dedupeNamespace` so evaluation never pollutes/collides production opportunities.
- After all cases finish: edge sampling → status `SAMPLED`.

## Sample (human review subset)

Metrics always use the **full** batch. Humans grade a stratified edge subset, e.g.:

- regression fixtures (Tobey/Iron Spider)
- contradicted / unverified claims
- high opportunity + low factual confidence
- QA fails
- HIGH distribution + AGGREGATOR reliability (separate dimensions)
- control TRADE / VERIFIED_EVENT strata

Seed fixtures are for regression coverage — not to inflate “% good.”

## Grade

A–D + 1–5: Truthfulness · Usefulness · Framing · Brand voice.

Grades never rewrite `corpusSnapshot`, `pipelineResult`, or `arieVersions`.

## Migration

`prisma/migrations/20260811120000_arie_validation_batches` — apply in your environment when ready. Do not deploy from this change set unless explicitly requested.
