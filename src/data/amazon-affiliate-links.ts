/**
 * Manual Amazon SiteStripe links, keyed by movie slug (the /movies/[slug] segment).
 *
 * To add one: paste the slug and the full affiliate URL, then commit and deploy.
 * Example:
 *   "the-godfather-1972": "https://www.amazon.com/dp/B00ASIN?tag=yourtag-20",
 *
 * Leave this empty until you have links. Pages with no entry show nothing.
 */
export const AMAZON_AFFILIATE_LINKS: Record<string, string> = {}
