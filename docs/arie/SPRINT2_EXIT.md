# ARIE Sprint 2 — Exit checklist

Do **not** start Sprint 3 publish automation until this bar is met.

Full plan: [VALIDATION.md](./VALIDATION.md)  
After corpus: freeze [BASELINE.md](./BASELINE.md)

North-star: if you showed someone the draft without saying it was AI, would they assume a knowledgeable film fan who knows ActorRating wrote it?

---

## Corpus

**100–150** tweets (not random-only):

- ~30 breaking (Deadline, THR, Variety)  
- ~30 aggregators (Film Updates, DiscussingFilm, …)  
- ~20 opinion/discussion  
- ~20 trailers/posters/box office  
- ~20 **should ignore**  

Grade in `/admin/arie` (A–D + Relevance / Insight / Accuracy / Brand voice 1–5).

---

## Gates

| Gate | Target |
| --- | --- |
| A+B | ≥ 80% |
| D | &lt; 5% |
| Avg Context Coverage | ≥ 85% |
| Median generation latency | &lt; 2s |
| Factual hallucinations (AR data) | **0** |
| Opportunity Score vs grades | High scores → mostly A/B; low → ignore/weak |

Entity accuracy (manual audit on sample):

| Metric | Target |
| --- | --- |
| Entity extraction accuracy | &gt; 98% |
| Wrong entity links | &lt; 1% |
| Missing important context | &lt; 5% |

---

## Package questions (every A candidate)

1. Who?  
2. What happened?  
3. Why does ActorRating care?  
4. What unique data do we have?  
5. What comparison can we make?  

Missing → improve **Context Builder**, not the prompt.

---

## Sprint 3 shape (only after freeze)

```text
Draft → QA → Constitution → Policy → Similarity → Rate limits → Publisher
```

Those steps should barely change content. If they rewrite heavily, return to Sprint 2.
