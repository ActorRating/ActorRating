# ARIE Sprint 1 — ops notes

## Migrate

```bash
npx prisma@6.16.2 migrate deploy
```

## Env

| Variable | Purpose |
| --- | --- |
| `ARIE_SERVICE_KEY` | Bearer / `x-arie-key` for `/api/arie/ingest` |
| `ARIE_INGEST_ENABLED` | default on; set `false` to pause ingest |
| `ARIE_PUBLISH_ENABLED` | must be `true` to publish (Sprint 3+); default off |
| `ARIE_MONTHLY_BUDGET_USD` | default `20` |
| `ARIE_COST_GOVERNOR_ENABLED` | default on |
| `GROQ_API_KEY` or `ARIE_GROQ_API_KEY` | Groq |
| `ARIE_GROQ_MODEL` | optional model id |
| `ARIE_X_BEARER_TOKEN` or `X_BEARER_TOKEN` | X API read |

## Smoke

```bash
curl -s "$ORIGIN/api/arie/health" | jq .
curl -s -X POST "$ORIGIN/api/arie/ingest" \
  -H "Authorization: Bearer $ARIE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"externalId":"demo-1","text":"Nolan casts Matt Damon","authorHandle":"variety"}'
```

## Next

Sprint 2 — Knowledge API · Knowledge Graph · Context Builder · Opportunity Score.
