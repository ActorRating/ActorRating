# ARIE Soft-launch (real-world testing)

**Goal:** Post real replies from the ActorRating X account under human supervision, with an optional narrow auto lane.

## Env (Coolify)

| Variable | Required | Notes |
| --- | --- | --- |
| `ARIE_PUBLISH_ENABLED` | yes (`true`) | Master kill switch — unset/false = no posts |
| `ARIE_X_API_KEY` | yes | X Developer App API key |
| `ARIE_X_API_SECRET` | yes | API secret |
| `ARIE_X_ACCESS_TOKEN` | yes | User access token for @ActorRating |
| `ARIE_X_ACCESS_SECRET` | yes | User access token secret |
| `ARIE_AUTO_PUBLISH_ENABLED` | optional | `true` for narrow auto |
| `ARIE_AUTO_PUBLISH_MIN_OPPORTUNITY` | optional | default `72` |
| `ARIE_AUTO_PUBLISH_DAILY_CAP` | optional | default `12` |

Also run migration:

```bash
npx prisma@6.16.2 migrate deploy
```

## Manual path (recommended first)

1. Open `/admin/arie`
2. Queue a real tweet with id under the handle:

```text
@deadline
1850123456789012345
Jason Clarke Joins Action-Thriller 'Supermax' …
```

3. **Next** → review / edit draft  
4. Confirm tweet id → **Approve & Post reply**  
5. To stop immediately: set `ARIE_PUBLISH_ENABLED=false` and redeploy (or restart with env)

## Narrow auto path

When `ARIE_PUBLISH_ENABLED=true` **and** `ARIE_AUTO_PUBLISH_ENABLED=true`:

- Draft must be a real reply (not `[NO REPLY]` / ignore)
- Source tweet id present
- Opportunity ≥ min
- Under daily cap

Auto runs after queue **Next** generates a draft. Supervise via health (`/api/arie/health`) and publish status on the draft card.

## Safety

- Silence / ignore never auto-posts  
- Idempotent: already-published previews return the same tweet id  
- Publisher is the only module that calls X write APIs
