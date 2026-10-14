"use client"

import Image from "next/image"
import type { FaceOffPublicEntity } from "@/lib/faceoff/types"
import { DISPLAY } from "@/components/faceoff/states"

export function MatchupCard({
  entity,
  onChoose,
  disabled,
  offsetX = 0,
}: {
  entity: FaceOffPublicEntity
  onChoose: () => void
  disabled?: boolean
  offsetX?: number
}) {
  const initial = entity.name.slice(0, 1)
  const detail = entity.type === "performance"
    ? [entity.filmTitle, entity.year].filter(Boolean).join(" · ")
    : entity.subtitle
  return (
    <article
      className="flex flex-col min-w-0"
      style={{ transform: offsetX ? `translateX(${offsetX}px)` : undefined }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onChoose}
        aria-label={`Choose ${entity.name}`}
        className="group text-left rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700] disabled:cursor-wait"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-white/10 bg-zinc-950">
          {entity.imageUrl ? (
            <Image
              src={entity.imageUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 46vw, 320px"
              className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl text-white/70" style={DISPLAY}>
              {initial}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
        <h2 className="mt-2.5 text-lg sm:text-2xl text-white leading-tight text-center" style={DISPLAY}>
          {entity.name}
        </h2>
        {detail ? (
          <p className="mt-1 text-center text-xs sm:text-sm text-zinc-400 leading-snug line-clamp-2">{detail}</p>
        ) : null}
        {entity.type === "performance" && entity.character ? (
          <p className="mt-0.5 text-center text-[11px] sm:text-xs text-[#FFD700]/80">as {entity.character}</p>
        ) : null}
      </button>
    </article>
  )
}
