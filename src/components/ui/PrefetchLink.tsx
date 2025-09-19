"use client"

import Link, { LinkProps } from "next/link"
import { useRouter } from "next/navigation"
import React from "react"

type PrefetchLinkProps = LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>

export function PrefetchLink({ href, onMouseEnter, onFocus, prefetch = true, ...rest }: PrefetchLinkProps) {
  const router = useRouter()

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      // Aggressively prefetch on hover
      // @ts-expect-error prefetch is supported in app router at runtime
      if (typeof router.prefetch === 'function') router.prefetch(typeof href === 'string' ? href : href.toString())
    } catch {}
    onMouseEnter?.(e)
  }

  const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    try {
      // Prefetch on keyboard focus
      // @ts-expect-error prefetch is supported in app router at runtime
      if (typeof router.prefetch === 'function') router.prefetch(typeof href === 'string' ? href : href.toString())
    } catch {}
    onFocus?.(e)
  }

  return (
    <Link href={href} prefetch={prefetch} onMouseEnter={handleMouseEnter} onFocus={handleFocus} {...rest} />
  )
}


