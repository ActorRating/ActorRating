# Validation Corpus v1 (VM1)

**Purpose:** Validate ARIE on the sources most likely to create **distribution for ActorRating** — not a generic “movie Twitter” sample.

**Status:** Collecting — freeze near ~125 entries, then keep stable for reruns.

Analytics already show where replies earn impressions. The corpus (and priority handles) follows that map.

## Source priority (growth, not prestige)

| Stars | Account | Why |
| --- | --- | --- |
| ⭐⭐⭐⭐⭐ | **BoinkBuzz** | Highest avg impressions / reply (~4.4k) |
| ⭐⭐⭐⭐⭐ | **ChaosCrave** | Consistently strong (~2.3k / reply) |
| ⭐⭐⭐⭐ | **Film Updates** | Huge volume, fast news |
| ⭐⭐⭐⭐ | **Deadline** | High-quality industry news |
| ⭐⭐⭐ | **DiscussingFilm** | News + discussion mix |
| ⭐⭐⭐ | **Variety / THR** | Credibility |
| ⭐⭐ | **Cinema Tweets** | More opinion-led |

Always record **`authorHandle`** on every eval (already required in `/admin/arie`). After 100–150 grades you want slices like:

- BoinkBuzz: 90% A/B  
- ChaosCrave: 85% A/B  
- Deadline: 78% A/B  
- Opinion accounts: 45% A/B  

That tells ARIE **where to spend Opportunity / budget**, not only whether a draft “sounds good.”

## Weighted mix (~125) — distribution-first

| Target | Source / bucket | `authorHandle` examples | Notes |
| --- | --- | --- | --- |
| **30** | BoinkBuzz | `boinkbuzz` | Core distribution |
| **25** | ChaosCrave | `chaoscrave` | Core distribution |
| **20** | Film Updates | `filmupdates` | Volume / speed |
| **15** | Deadline | `deadline` | Quality news |
| **10** | DiscussingFilm | `discussingfilm` | Mix |
| **10** | Variety / THR | `variety`, `thr` | Credibility |
| **15** | Mixed | various | Trailers, opinions, box office, **should-ignore** |

Of the **15 mixed**, keep a meaningful **should-ignore** slice (gossip, politics, noise). A system that knows when **not** to reply protects brand better than maxing reply count.

Do **not** optimize the corpus only for impression potential — include low-Opportunity and ignore cases on purpose.

## Optional `bucket` tags

Use for analysis; primary split is **by source account**.

| `bucket` | Use when |
| --- | --- |
| `distribution_core` | BoinkBuzz / ChaosCrave |
| `news_fast` | Film Updates |
| `news_trade` | Deadline / Variety / THR |
| `discussion` | DiscussingFilm / Cinema Tweets takes |
| `trailer_bo` | Trailers, posters, box office |
| `should_ignore` | Must not engage |

## Originals validation corpus

[`originals-v1.json`](./originals-v1.json) — curated seed fixtures for **regression**, not for inflating live validation samples.

Includes the Tobey Maguire / BoinkBuzz / Iron Spider case (with the later correction that there are no credible sources for the suit claim).

Use via `/admin/arie/validation`:

1. Create batch with **Include originals-v1 seed fixtures** (optional JSON upload merges in).
2. Run `score_only` or `full_pipeline`.
3. Grade only the sampled edge-case subset.
4. Each batch freezes corpus snapshot + ARIE/prompt versions for version comparisons.

Seed fixtures ≠ live sample inflation. Metrics cover the full batch; humans grade the review subset.

**Distribution priority ≠ reliability class.** Do not treat BoinkBuzz (or any aggregator) as “ignore” — treat their claims by evidence status.

## File format (replies)

[`corpus-v1.jsonl`](./corpus-v1.jsonl) — one JSON object per line:

```json
{
  "id": "v1-001",
  "bucket": "distribution_core",
  "authorHandle": "boinkbuzz",
  "text": "…",
  "sourceUrl": null,
  "notes": "optional"
}
```

`authorHandle` is **required** for every row (no anonymous corpus items).

## How to run a corpus pass (fast path)

1. Collect tweets in a notepad (weighted mix).  
2. `/admin/arie` → paste bulk format into **Corpus queue**:

```text
@boinkbuzz
tweet text…

---
@chaoscrave
tweet text…
```

3. **Add to queue** → **Next from queue** (or press `N`).  
4. Grade with keyboard: `A`/`B`/`C`/`D` (auto-advances). `Shift+D` = D + all subs 1.  
5. Ignores persist as `[IGNORED BY OPPORTUNITY]` so you can grade silence too.

X timeline auto-pull is later (same queue). For VM1, bulk paste is faster and controllable.

## Rules

- Prefer real tweets from those accounts (paraphrase only if needed).  
- Keep hard cases; don’t delete after a D.  
- Prefer reusing v1 over inventing v2.  
