"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useCallback,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react"

type InstantNavLinkProps = Omit<ComponentProps<typeof Link>, "href" | "children"> & {
  href: string
  children: ReactNode
}

/**
 * Next.js soft nav can miss the first physical click when scroll restoration is
 * manual or pointer hit-targets are ambiguous. Force router.push on first primary click.
 */
export function InstantNavLink({
  href,
  children,
  onClick,
  prefetch = true,
  ...rest
}: InstantNavLinkProps) {
  const router = useRouter()

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      if (e.defaultPrevented) return
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (e.currentTarget.target === "_blank") return
      if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) return
      e.preventDefault()
      router.push(href)
    },
    [href, onClick, router],
  )

  return (
    <Link href={href} prefetch={prefetch} onClick={handleClick} {...rest}>
      {children}
    </Link>
  )
}
