# ActorRating Intelligence Engine (ARIE)

Source of truth for ActorRating’s **cinema intelligence engine** (channel-agnostic).

| Doc | Role |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | RFC **v1.2 FROZEN** |
| [BRAND_CONSTITUTION.md](./BRAND_CONSTITUTION.md) | Permanent law for every agent |

**Freeze rule:** No new architectural features unless a sprint exposes a real need.

**Build order (locked):** Sprint 1 → 6 as in the RFC. Currently: **Sprint 1 — Infrastructure**.

```
docs/arie/
  ARCHITECTURE.md
  BRAND_CONSTITUTION.md
  prompts/          # semver’d agent prompts (as agents land)
  runbooks/
  adr/              # rare under freeze
```
