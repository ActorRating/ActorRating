# ARIE Sprint 2 — Exit checklist

**Sprint 2 = feature-complete.** Status: [STATUS.md](./STATUS.md)

Do **not** start Sprint 3 until this file is green **and** [BASELINE.md](./BASELINE.md) is filled/frozen.

Plan: [VALIDATION.md](./VALIDATION.md) · Corpus: [corpus/](./corpus/)

North-star: without being told it’s AI, would a film-literate reader assume an ActorRating-aware human wrote it?

Stop builder work when: *remaining misses are reasoning/creativity — not missing context.*

---

## Corpus

Frozen **Validation Corpus v1** (~125) with bucket mix in [corpus/README.md](./corpus/README.md).

Grade in batches of **~25** (blind → analyze → optional one change → next).

---

## Gates

| Gate | Target |
| --- | --- |
| A+B | ≥ 80% |
| D | &lt; 5% |
| Avg Context Coverage | ≥ 85% |
| Median generation latency | &lt; 2s |
| Factual hallucinations (AR data) | **0** |
| Opportunity ↔ grade correlation | High opp → mostly A/B; low → ignore/weak |

Entity sample audit:

| Metric | Target |
| --- | --- |
| Extraction accuracy | &gt; 98% |
| Wrong entity | &lt; 1% |
| Missing important context | &lt; 5% |

---

## Sprint 3 (only after freeze)

```text
Draft → QA → Constitution → Policy → Similarity → Rate limits → Publisher
```

Those steps should barely rewrite content. If they do, return here.
