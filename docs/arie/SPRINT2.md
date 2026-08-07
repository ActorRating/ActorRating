# ARIE Sprint 2 — Context intelligence

## Pipeline (locked)

```text
Tweet → Entity extraction → Knowledge Graph → Context Builder → Context Package → (LLM later)
```

The LLM does **not** decide what to fetch.

## Migrate

```bash
npx prisma@6.16.2 migrate deploy
```

## Endpoints (require `ARIE_SERVICE_KEY`)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/arie/ingest` | Ingest + auto-process → score + package |
| POST | `/api/arie/context` | `{ text }` or `{ eventId }` → Context Package |
| GET | `/api/arie/resolve?q=` | Entity extraction only |
| GET | `/api/arie/graph/neighborhood?q=` | Graph traversal preview |
| POST | `/api/arie/preview-draft` | Package → Groq draft (no publish) |
| GET | `/api/arie/health` | Readiness |

## Milestone test

```bash
curl -s -X POST "$ORIGIN/api/arie/preview-draft" \
  -H "Authorization: Bearer $ARIE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"Leonardo DiCaprio joins Nolan'\''s next film.","authorHandle":"deadline"}' | jq .
```

Expect: high `opportunityScore`, rich `package.facts`, a craft-first `draft.reply`, `confidence` in response.

Also try Film Updates / Deadline-style casting blurbs. Iterate on extraction + package shape—not on prompts—until drafts look excellent.

## Next

Sprint 3 — Reply Agent · QA Agent · Publisher (publishing is mechanical once drafts are reliable).
