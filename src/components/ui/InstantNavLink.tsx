"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useCallback,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react"

type InstantNavLinkProps = Omit<ComponentProps<typeof Link>, "href" | "children"> & {
  href: string
  children: ReactNode
}

function isModifiedClick(
  e: Pick<MouseEvent, "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "button">,
) {
  return e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
}

function shouldHandleHref(href: string) {
  return !href.startsWith("http") && !href.startsWith("mailto:") && !href.startsWith("#")
}

/**
 * Next.js soft nav can miss the first physical click when scroll restoration is
 * manual or pointer hit-targets are ambiguous. Force router.push on first primary
 * press (pointerdown for mouse/pen; click for touch / keyboard).
 */
export function InstantNavLink({
  href,
  children,
  onClick,
  onPointerDown,
  prefetch = true,
  ...rest
}: InstantNavLinkProps) {
  const router = useRouter()
  const pushedRef = useRef(false)

  const push = useCallback(() => {
    if (pushedRef.current) return
    pushedRef.current = true
    router.push(href)
    // Allow a later click if soft nav was cancelled / same-route no-op.
    window.setTimeout(() => {
      pushedRef.current = false
    }, 800)
  }, [href, router])

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLAnchorElement>) => {
      onPointerDown?.(e)
      if (e.defaultPrevented) return
      // Touch keeps native click timing (avoids fighting scroll gestures).
      if (e.pointerType === "touch") return
      if (isModifiedClick(e)) return
      if (e.currentTarget.target === "_blank") return
      if (!shouldHandleHref(href)) return
      e.preventDefault()
      push()
    },
    [href, onPointerDown, push],
  )

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      if (e.defaultPrevented) return
      if (isModifiedClick(e)) return
      if (e.currentTarget.target === "_blank") return
      if (!shouldHandleHref(href)) return
      e.preventDefault()
      push()
    },
    [href, onClick, push],
  )

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Link>
  )
}
