/**
 * First-party attribution for ARIE original posts.
 * Identifier is stable (opportunity id) so PageView utm_content joins to ArieOpportunity.
 */

export const ARIE_UTM_SOURCE = "x"
export const ARIE_UTM_MEDIUM = "social"
export const ARIE_UTM_CAMPAIGN = "arie_original"

export function originalAttributionCode(opportunityId: string): string {
  return opportunityId
}

/** Append ARIE UTM params to an ActorRating absolute or site-relative URL. */
export function withArieOriginalUtm(input: {
  href: string
  opportunityId: string
  siteOrigin?: string
}): string {
  const code = originalAttributionCode(input.opportunityId)
  let url: URL
  try {
    url = new URL(input.href)
  } catch {
    const origin = input.siteOrigin || process.env.NEXT_PUBLIC_SITE_URL || "https://actorrating.com"
    url = new URL(input.href.startsWith("/") ? input.href : `/${input.href}`, origin)
  }
  url.searchParams.set("utm_source", ARIE_UTM_SOURCE)
  url.searchParams.set("utm_medium", ARIE_UTM_MEDIUM)
  url.searchParams.set("utm_campaign", ARIE_UTM_CAMPAIGN)
  url.searchParams.set("utm_content", code)
  return url.toString()
}

/** Ensure draft JSON links destined for ActorRating carry attribution. */
export function decorateActorRatingLinks(
  links: Array<{ rel: string; href: string; label: string }>,
  opportunityId: string,
): Array<{ rel: string; href: string; label: string }> {
  return links.map((l) => {
    if (!/actorrating\.com|localhost|\/actors?\/|\/movies?\/|\/performances?\//i.test(l.href)) {
      return l
    }
    return { ...l, href: withArieOriginalUtm({ href: l.href, opportunityId }) }
  })
}
