# ARIE status — Soft-launch (real-world testing)

**Effective:** 2026-08-09  
**Mode:** Supervised live replies + narrow auto-publish  

| Allowed | Kill switches |
| --- | --- |
| Grade + **Approve & Post** from `/admin/arie` | `ARIE_PUBLISH_ENABLED=false` stops **all** posts |
| Narrow auto-post when flags + tweet id + opp clear | `ARIE_AUTO_PUBLISH_ENABLED=false` stops auto only |
| Continue validation batches | Daily cap `ARIE_AUTO_PUBLISH_DAILY_CAP` (default 12) |

**Not yet:** original posts, quote tweets, n8n publisher nodes, full QA agent.

How to enable live replies — see [SOFT_LAUNCH.md](./SOFT_LAUNCH.md).  
Exit gates for broader automation: [SPRINT2_EXIT.md](./SPRINT2_EXIT.md) · [BASELINE.md](./BASELINE.md)
