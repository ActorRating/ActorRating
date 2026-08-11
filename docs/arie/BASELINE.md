# ARIE Baseline (validation checkpoint)

**Status:** CHECKPOINT — filled from Batch 3–4 grading (2026-08-08 → 2026-08-09). **Not an exit freeze.** Sprint 3 / go-live still blocked until SPRINT2_EXIT gates are green.  
**Do not treat all-time admin totals as the scorecard** — early `preview-0.2`–`0.5` Ds dominate them.

| Field | Value |
| --- | --- |
| Freeze date | 2026-08-09 (checkpoint) |
| Corpus graded (all-time admin) | ~121 (mixed prompt versions) |
| Best current slice | Batch 4 on `reply-writer@preview-0.7` ≈ **21/24 A+B (~87%)**, D ≈ 2/24 (~8%) |
| Corpus mix | Distribution-weighted VM1 — BoinkBuzz, ChaosCrave, Film Updates, Deadline, DiscussingFilm, THR/Variety + ignore controls |
| Prompt version (current) | `reply-writer@preview-0.8` |
| Model | `groq/llama-3.3-70b-versatile` (+ deterministic prior-work fallback on Groq failure / 429) |
| Context Builder version | `context-builder@2.6` (provenance / evidence layer) |

---

## Grade distribution

### All-time admin snapshot (do not use for exit)

| Grade | Count | % (of graded) |
| --- | --- | --- |
| A | 29 | ~24% |
| B | 39 | ~32% |
| C | 9 | ~7% |
| D | 44 | ~36% |
| **A+B** | 68 | **~56%** _(below 80% gate — polluted by early writers)_ |
| **D** | 44 | **~36%** _(above 5% gate)_ |

### Current-writer slice (decision-relevant)

| Slice | A+B | D | Notes |
| --- | --- | --- | --- |
| Smoke `preview-0.6` (5) | 5/5 | 0 | Crawl→Fall prior fix verified |
| Batch 4 `preview-0.7` (~24) | ~21/24 (~87%) | ~2/24 (~8%) | Strong; false ignores on some casting language |
| `preview-0.8` | _re-run in progress / rate-limited_ | _TBD_ | Casting false-ignore + 1-decimal + no em dash |

**Exit still red:** need a frozen ~100 graded rows on **one** pinned writer with A+B ≥ 80%, D &lt; 5%, coverage ≥ 85%.

---

## A/B rate by source (directional from Batch 4 + priors)

| Source | Notes |
| --- | --- |
| BoinkBuzz | Strong when casting; silence correct on paparazzi / music |
| ChaosCrave | Strong casting replies; earlier false ignores on multi-picture / offered-lead (addressed in 0.8) |
| Film Updates | Generally A/B on casting; gossip ignore OK |
| Deadline | High A on joins / talks |
| DiscussingFilm | Correct ignore on reaction/ensemble blurbs |
| Variety / THR | Mixed; casting processable |
| Mixed / ignore | Engaged / music / toxic-adjacent — silence usually A |

_Fill exact N / A+B% per source after a clean 0.8-only corpus pass._

---

## Sub-score averages (1–5)

| Relevance | Insight | Accuracy | Brand voice |
| --- | --- | --- | --- |
| Mostly defaulted to 3 in early grading | Mostly 3 | Mostly 3 | Mostly 3 |

_Not diagnostic yet — re-score intentionally on exit batch._

---

## Context & scoring

| Metric | Value | Target |
| --- | --- | --- |
| Avg Context Coverage % | ~47% all-time | ≥ 85% ❌ |
| Avg Opportunity Score (all graded) | ~68 | — |
| Factual hallucinations (known) | Soft LLM lines / odd priors occasional; AR invent rare | **0** hard invent |
| Groq | Frequent `429` under batch grind; fallback drafts keep eval moving | Cap pace / retries |

---

## Pattern notes

**Worked**
- Score + short discussion question (`0.7`)
- Franchise-relevant priors (Marsden→X-Men, Evans→Winter Soldier)
- Theme prior (Crawl casting→Fall not romcom)
- Silence on gossip / music / engaged / empty reaction posts
- Prior-work fallback when Groq fails

**Failed / open**
- Opportunity false-ignores on `multi-picture`, `early talks`, `offered the lead` → fixed in `0.8` (verify on re-queue)
- Coverage stuck ~mid-40s (biggest quantitative exit gap)
- Director-only “cast not announced” sometimes pulls weak director-as-actor priors
- All-time A+B misleading until old prompt rows are excluded or corpus regraded on pinned version only

---

## Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Editor | Demir (checkpoint) | 2026-08-09 |
| Engineering | ARIE validation | 2026-08-09 |

**Go-live:** **No.** Stay validation-only.  
**Checkpoint:** Sprint 3 may begin only after this file is a true exit freeze **and** [SPRINT2_EXIT.md](./SPRINT2_EXIT.md) gates are met.
