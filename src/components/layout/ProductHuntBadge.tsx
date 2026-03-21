export function ProductHuntBadge() {
  return (
    <a
      href="https://www.producthunt.com/products/actorrating?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-actorrating"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        zIndex: 99999,
        display: 'block',
        width: 250,
        height: 54,
      }}
    >
      <img
        alt="ActorRating - Rate acting performances, not just movies | Product Hunt"
        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1103021&theme=light&t=1774074328665"
        width={250}
        height={54}
        style={{ display: 'block', width: 250, height: 54 }}
      />
    </a>
  )
}
