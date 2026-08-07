# ARIE Sprint 2 — Validation plan

**Do not start Sprint 3 yet.** Architecture can wait. Measurement cannot.

Every day spent validating Sprint 2 is worth more than a day spent building publish automation.

UI: `/admin/arie`  
Exit gate: [SPRINT2_EXIT.md](./SPRINT2_EXIT.md)  
After ~100 graded previews: freeze [BASELINE.md](./BASELINE.md)

---

## Evaluation corpus (100–150 tweets)

Do **not** grab only random posts. Build a representative set:

| Bucket | Count | Sources / examples |
| --- | --- | --- |
| Breaking news | ~30 | Deadline, THR, Variety |
| Aggregators | ~30 | Film Updates, DiscussingFilm, Cinema Tweets |
| Opinion / discussion | ~20 | Takes, debates, “overrated” threads |
| Trailers / posters / box office | ~20 | Official + trade coverage |
| **Should ignore** | ~20 | Gossip, politics, weather, memes, low-AR relevance |

The last bucket tests whether Opportunity Score correctly says **don’t engage**.

Tag `authorHandle` on each generate so later you can slice grades by source.

---

## Scoring rubric

### Overall (required)

| Grade | Meaning |
| --- | --- |
| **A** | Would post unchanged |
| **B** | Tiny edit |
| **C** | Rewrite needed |
| **D** | Unusable |

### Sub-scores (1–5, required when grading)

| Metric | Question |
| --- | --- |
| **Relevance** | Did it actually address the tweet? |
| **Insight** | Did ActorRating add something unique? |
| **Accuracy** | Were the facts correct? |
| **Brand voice** | Did it sound like ActorRating? |

An A should not be “felt good” — the four scores explain *why*.

---

## Watch patterns, not one-offs

| Pattern | Action |
| --- | --- |
| D grades + missing Comparisons / Radar | Improve **Context Builder** |
| Opinion tweets often drafted / low grades | Opportunity Score should **down-rank** them |
| Breaking news → many A/B | Sweet spot — lean pipeline here |
| High Opportunity Score → many C/D | Scoring model is **broken** (fix correlation) |
| High Coverage + D | Builder OK; writer/prompt issue (rare this early) |
| Low Coverage + D | Fix builder slots, not prompts |

---

## Milestone before Sprint 3

- ✅ A+B ≥ 80%  
- ✅ D &lt; 5%  
- ✅ Average Context Coverage ≥ 85%  
- ✅ Median generation latency &lt; 2s  
- ✅ Zero factual hallucinations from ActorRating data  
- ✅ Opportunity Score correlates with grades (high-score drafts usually A/B)  

North-star: without being told it’s AI, would a knowledgeable film fan assume an ActorRating-aware human wrote it?

---

## After the first ~100 grades

1. Fill [BASELINE.md](./BASELINE.md) with frozen numbers (prompt version, grade mix, coverage, latency, cost).  
2. **Freeze** that file — future changes compete against it.  
3. Only then start Sprint 3 safeguards:

```text
Draft → QA → Constitution → Policy → Similarity → Rate limits → Publisher
```

If those steps rewrite content heavily, Sprint 2 is not done.
