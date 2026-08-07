# ARIE Sprint 2 — Validation plan

**Sprint 2 is feature-complete.** Do not treat this as “grading AI.” Treat it as building a **measurable ML-style dataset**.

UI: `/admin/arie`  
Exit: [SPRINT2_EXIT.md](./SPRINT2_EXIT.md)  
Freeze after: [BASELINE.md](./BASELINE.md) · [corpus/](./corpus/)

---

## Operating rule

```text
Batch (≈25)
   ↓
Blind grade
   ↓
Stop & analyze patterns
   ↓
One justified Context Builder / Opportunity change (or none)
   ↓
Next batch
```

Do **not** continuously modify the builder while grading. Otherwise you cannot attribute outcomes.

---

## Phase 1 — Blind grading

Do not think about how the reply was generated.

Ask only:

> If I saw this reply under Deadline, would I be happy that it came from ActorRating?

| Answer | Grade |
| --- | --- |
| Yes | **A** or **B** |
| No | **C** or **D** |

Avoid “helping” the AI because you know how the pipeline works.

Then fill 1–5: Relevance · Insight · Accuracy · Brand voice (so A isn’t just “felt good”).

---

## Phase 2 — Pattern analysis (every 25)

Stop. Do not race to 100.

Ask:

- Why were the D’s D’s?
- Why were the A’s A’s?

Look for **clusters**, not one-offs.

Example:

```text
25 drafts → 17 A/B · 6 C · 2 D

Both D's: no previous collaboration found
↓
Knowledge Graph / Context Package gap
```

That is more valuable than “68% A/B.”

Record cluster notes in the grade `notes` field and eventually in BASELINE.md.

---

## Phase 3 — Freeze improvements

```text
Batch 1 → Analyze → Improve (or not)
Batch 2 → Analyze → Improve (or not)
…
```

One change per batch when justified. No drive-by edits mid-grade.

---

## Prediction Accuracy (derive this)

You already log Opportunity Score + Human Grade. Check whether score **predicts** quality.

| Opportunity | Human | OK? |
| --- | --- | --- |
| 95 | A | ✓ |
| 92 | A | ✓ |
| 88 | B | ✓ |
| 81 | D | ✗ scorer lie |
| 71 | C | maybe |
| &lt;50 ignored | (should not draft) | ✓ if ignored |

**Wanted:** high Opportunity → mostly A/B; low Opportunity → ignore or weak.

If 95-point opportunities often become C/D, recalibrate Opportunity Score — don’t only polish prompts.

Quick SQL-style checks after grades exist (run in admin DB / `psql`):

```sql
-- Avg opportunity by grade
SELECT "humanGrade", COUNT(*), ROUND(AVG("opportunityScore")::numeric, 1) AS avg_opp
FROM "AriePreviewEval"
WHERE "humanGrade" IS NOT NULL
GROUP BY 1 ORDER BY 1;

-- High score but poor grade (prediction failures)
SELECT id, "opportunityScore", "humanGrade", "coveragePercent", LEFT("sourceText", 80)
FROM "AriePreviewEval"
WHERE "opportunityScore" >= 85 AND "humanGrade" IN ('C', 'D');
```

---

## Evaluation corpus (freeze it)

Don’t only use “today’s feed.” Build and **keep**:

**Validation Corpus v1** — ~125 tweets  
See [corpus/README.md](./corpus/README.md).

Buckets:

| Bucket | Count |
| --- | --- |
| Breaking (Deadline, THR, Variety) | ~30 |
| Aggregators (Film Updates, DiscussingFilm, …) | ~30 |
| Opinion / discussion | ~20 |
| Trailers / posters / box office | ~20 |
| Should ignore | ~20 |

In three months, **rerun the exact same corpus**. That is an objective version benchmark.

---

## When to stop improving Sprint 2

Stop when this sentence is true:

> The remaining weaknesses are due to reasoning or creativity — **not** missing context.

If every draft has rich, relevant context and occasional weak replies are pure LLM limits, Sprint 2 has extracted its value.

Expect most wins from **one more fact/comparison in the package** (e.g. last Nolan collab, career radar, closest comparable, community consensus) — not prompt rewrites.

---

## Explicit freeze (now)

Until BASELINE.md is frozen:

1. No new features  
2. No new agents  
3. No Sprint 3 work  
4. Only: evaluate · pattern · justified builder/score fixes · freeze baseline  
