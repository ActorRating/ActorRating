# ARIE status — Originals A–D hardened (pre-deploy)

**Effective:** 2026-08-10  
**Modes:**

1. **Reply soft-launch (human-on-X)** — `/admin/arie`
2. **Original Content Engine** — `/admin/arie/originals` with prediction + metrics schema

| Flag | Default |
| --- | --- |
| `ARIE_PUBLISH_ENABLED` | **false** |
| `ARIE_ORIGINAL_PUBLISH_ENABLED` | **false** |
| `ARIE_AUTO_PUBLISH_ENABLED` | **false** |

Human Approve → Publisher → X remains the only original write path. Idempotent publish lock prevents double-post.

Docs: [ORIGINALS.md](./ORIGINALS.md) · [SOFT_LAUNCH.md](./SOFT_LAUNCH.md)
