# ARIE Soft-launch (real-world testing)

**Goal:** Ship craft-first reply *drafts* into the real distribution loop via a **human** on X — without bypassing X API limits.

## Constraint (confirmed)

With current X API authorization, automated replies to arbitrary third-party posts return:

> You can only reply to or quote posts where you are mentioned or are the author.

We **do not** attempt to bypass that. Soft-launch does **not** API-post cold replies to FilmUpdates / ChaosCrave / etc.

## Soft-launch workflow (third-party)

1. `/admin/arie` — queue a real tweet (optional URL/id under `@handle`)
2. **Next** → review / edit draft
3. **Copy draft**
4. **Open on X** → paste reply as @ActorRating in the official client
5. Grade A–D in admin as usual

Auto-publish stays **off** (`ARIE_AUTO_PUBLISH_ENABLED` unset / not `true`).

## Originals (parallel track)

Strategic original publishing is documented in [ORIGINALS.md](./ORIGINALS.md) (`/admin/arie/originals`). That path uses `postOriginalTweet` via Publisher and requires `ARIE_ORIGINAL_PUBLISH_ENABLED=true` **plus** human approval. It does not enable cold third-party replies.

## Publisher (kept, unused for cold replies)

`Publisher` remains the only choke point that may call X write APIs (mention/own-post or future authorized cases). Soft-launch UI does **not** call Approve & Post for third-party cold replies.

Kill switch still exists for when API write is authorized for a given use case:

| Variable | Default | Notes |
| --- | --- | --- |
| `ARIE_PUBLISH_ENABLED` | off unless `"true"` | Must stay off for quiet API posting |
| `ARIE_AUTO_PUBLISH_ENABLED` | off | **Keep disabled** for soft-launch |
| OAuth 1.0a write keys | optional | Only needed if using Publisher later |

## Safety

- No code path invented to dodge X 403  
- Silence / ignore never offered as copy targets in the soft-launch card  
- Context Builder / Opportunity / writer unchanged for this workflow change
