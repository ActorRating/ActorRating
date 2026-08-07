# Validation Corpus v1

**Purpose:** Fixed evaluation set for ARIE. Rerun across Context Builder / Opportunity Score versions.

**Status:** Collecting — freeze when you have ~125 entries, then do not casually rewrite the set.

## Target mix

| `bucket` | Target | Notes |
| --- | --- | --- |
| `breaking` | 30 | Deadline, THR, Variety |
| `aggregator` | 30 | Film Updates, DiscussingFilm, Cinema Tweets |
| `opinion` | 20 | Takes / discourse |
| `trailer_bo` | 20 | Trailers, posters, box office |
| `should_ignore` | 20 | Gossip, politics, noise — Opportunity should ignore |

## File format

Add rows to [`corpus-v1.jsonl`](./corpus-v1.jsonl) — one JSON object per line:

```json
{
  "id": "v1-001",
  "bucket": "breaking",
  "authorHandle": "deadline",
  "text": "Leonardo DiCaprio joins Nolan's next film.",
  "sourceUrl": null,
  "notes": optional
}
```

## How to run a corpus pass

1. For each line: `/admin/arie` → set handle → paste `text` → Generate → blind grade + subscores.  
2. Put preview id / grade notes back later if needed (optional field `"previewId"` after eval).  
3. After full pass: fill [../BASELINE.md](../BASELINE.md) and stop changing builder mid-stream.

## Rules

- Prefer real tweets (paraphrase only if needed for ToS / privacy).  
- Keep should_ignore honestly ignore-worthy.  
- Do not drop hard cases after a bad grade — that destroys the benchmark.  
- Version bumps: new file `corpus-v2.jsonl` only if the product’s world truly changed; prefer reusing v1.
