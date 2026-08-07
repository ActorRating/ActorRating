# ARIE Sprint 2 — Exit checklist

Do **not** start Sprint 3 publish automation until this bar is met.

North-star test: if you showed someone the draft without saying it was AI, would they assume a knowledgeable film fan who knows ActorRating wrote it?

---

## Corpus

Run **100 real tweets** from (mix):

- Deadline  
- Film Updates  
- DiscussingFilm  
- The Hollywood Reporter  
- Variety  
- Empire  
- Rotten Tomatoes  

Use `/admin/arie` → paste → Generate draft → grade A–D.

---

## Context Package quality

| Metric | Target |
| --- | --- |
| Entity extraction accuracy | &gt; 98% |
| Wrong entity links | &lt; 1% |
| Missing important context | &lt; 5% |

Every package should answer:

1. Who?  
2. What happened?  
3. Why does ActorRating care?  
4. What unique data do we have?  
5. What comparison can we make?  

If any answer is missing → **improve the Context Builder**, not the prompt.

---

## Opportunity Score distribution (≈100 tweets)

| Band | Share |
| --- | --- |
| Ignore (0–49) | ≈ 70% |
| Interesting (50–69) | ≈ 20% |
| Worth drafting (70–84) | ≈ 8% |
| Must reply (85+) | ≈ 2% |

If half score above 80, scoring is too generous.

---

## Context Coverage Score

Logged per preview (Actor / Movie / Director / Radar / Comparisons / Awards / Community).

Weak draft + high coverage → prompt / writer issue.  
Weak draft + low coverage → **builder** issue.

Awards may stay ✗ until a later builder slot exists — that gap is intentional signal.

---

## Draft quality (manual grade of 100 previews)

| Grade | Meaning |
| --- | --- |
| A | Would post unchanged |
| B | Tiny edit |
| C | Rewrite needed |
| D | Unusable |

**Bar:** A+B ≥ 80% · D &lt; 5%

Only then move to automation.

---

## What Sprint 3 must be

```text
Draft → QA → Policy checks → Duplicate detection → Similarity →
Brand Constitution validation → Publish
```

Publishing is the last line — not the product.

---

## Ops

1. `npx prisma@6.16.2 migrate deploy`  
2. Open `/admin/arie`  
3. Grade. Export comes in Sprint 6 analytics — raw rows live in `AriePreviewEval`.
