# UTM & social posting convention

Use these params when sharing ActorRating links off-site so admin traffic can attribute first-touch.

## Tracked link builder

```ts
import { buildTrackedUrl } from "@/lib/tracking/tracked-url"

buildTrackedUrl("/movies/the-odyssey-2026/best-performances", {
  utm_source: "x",
  utm_medium: "reply",
  utm_campaign: "odyssey_hub",
})
// → https://actorrating.com/movies/...?utm_source=x&utm_medium=reply&utm_campaign=odyssey_hub
```

## Conventions

| Param | Allowed / examples |
|-------|-------------------|
| `utm_source` | `x` · `tiktok` · `reddit` · `instagram` · `youtube` |
| `utm_medium` | `social` · `reply` · `bio` · `organic` |
| `utm_campaign` | e.g. `odyssey_hub`, `actor_launch_{slug}` |
| `utm_content` | optional creative id |
| `utm_term` | optional keyword |

Also supported on-site: `?src=x` normalizes like `utm_source=x` for acquisition cookies.

## X (Twitter) hygiene

- **Post body:** no link (copy + CTA only).
- **First reply:** paste the tracked URL.
- This avoids the link preview competing with the post and keeps the primary tweet readable.

## Examples

```
# Odyssey hub — X reply
buildTrackedUrl("/movies/the-odyssey-2026/best-performances", {
  utm_source: "x",
  utm_medium: "reply",
  utm_campaign: "odyssey_hub",
})

# TikTok bio
buildTrackedUrl("/", {
  utm_source: "tiktok",
  utm_medium: "bio",
  utm_campaign: "brand",
})
```
