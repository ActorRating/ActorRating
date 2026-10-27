/**
 * Shared Odyssey forest hero still — pre-encoded AVIF/WebP/JPEG via <picture>.
 * Prefer this over next/image on the already-compressed webp (double-encode mush).
 */

const AVIF = "/hero/odyssey-damon-forest.avif"
const WEBP = "/hero/odyssey-damon-forest.webp"
const JPEG = "/hero/odyssey-damon-forest-1920.jpg"
const SIZES = "(max-width: 1023px) 100vw, 2125px"

type Props = {
  className?: string
  /** Extra classes on the <img> (e.g. hero-still). */
  imgClassName?: string
}

export function OdysseyForestStill({
  className,
  imgClassName = "object-cover object-center",
}: Props) {
  return (
    <picture className={className}>
      <source srcSet={AVIF} type="image/avif" sizes={SIZES} />
      <source srcSet={WEBP} type="image/webp" sizes={SIZES} />
      {/* eslint-disable-next-line @next/next/no-img-element -- LCP still; formats via <picture> */}
      <img
        src={JPEG}
        alt=""
        fetchPriority="high"
        decoding="async"
        sizes={SIZES}
        className={`absolute inset-0 h-full w-full ${imgClassName}`}
      />
    </picture>
  )
}

export const ODYSSEY_FOREST_STILL_WEBP = WEBP
