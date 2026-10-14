"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { FACEOFF_IMAGE_SIZES } from "@/components/faceoff/MatchupCard"

export function PortraitWarm({
  matchupId,
  urls,
  onReady,
}: {
  matchupId: string
  urls: string[]
  onReady: (matchupId: string) => void
}) {
  const pending = useRef(new Set(urls))
  const rootRef = useRef<HTMLDivElement>(null)

  const urlKey = urls.join("|")

  useEffect(() => {
    if (urls.length === 0) onReady(matchupId)
  }, [matchupId, onReady, urls.length])

  useEffect(() => {
    const root = rootRef.current
    if (!root || urls.length === 0) return
    let stopped = false
    let id = 0
    const tick = () => {
      if (stopped) return
      const images = [...root.querySelectorAll("img")]
      if (images.length < urls.length) return
      if (!images.every((image) => image.complete)) return
      stopped = true
      window.clearInterval(id)
      onReady(matchupId)
    }
    id = window.setInterval(tick, 32)
    tick()
    return () => {
      stopped = true
      window.clearInterval(id)
    }
  }, [matchupId, onReady, urlKey, urls.length])

  function finish(url: string) {
    pending.current.delete(url)
    if (pending.current.size === 0) onReady(matchupId)
  }

  if (urls.length === 0) return null

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none fixed top-0 -left-[120vw] h-[210px] w-[160px] overflow-hidden">
      {urls.map((url) => (
        <div key={url} className="relative h-[210px] w-[158px]">
          <Image
            alt=""
            src={url}
            fill
            priority
            sizes={FACEOFF_IMAGE_SIZES}
            onLoad={(event) => {
              const image = event.currentTarget
              if (typeof image.decode === "function") {
                void image.decode().then(() => finish(url)).catch(() => finish(url))
                return
              }
              finish(url)
            }}
            onError={() => finish(url)}
          />
        </div>
      ))}
    </div>
  )
}
