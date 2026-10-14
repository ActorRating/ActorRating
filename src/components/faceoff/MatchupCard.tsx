"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import type { FaceOffPublicEntity } from "@/lib/faceoff/types"
import { DISPLAY } from "@/components/faceoff/states"

export const FACEOFF_IMAGE_SIZES = "(max-width: 640px) 42vw, 200px"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
  return letters || "•"
}

export function MatchupCard({
  entity,
  onChoose,
  disabled,
  emphasis = "idle",
  priority = false,
}: {
  entity: FaceOffPublicEntity
  onChoose: () => void
  disabled?: boolean
  emphasis?: "idle" | "chosen" | "dim"
  priority?: boolean
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [entity.imageUrl, entity.id])

  const film = entity.type === "performance"
    ? [entity.filmTitle, entity.year].filter(Boolean).join(" · ")
    : null
  const actorNote = entity.type === "actor" ? entity.subtitle : null
  const showImage = Boolean(entity.imageUrl) && !failed

  return (
    <article
      className={`min-w-0 transition-opacity duration-150 motion-reduce:transition-none ${
        emphasis === "dim" ? "opacity-40" : "opacity-100"
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onChoose}
        aria-label={`Choose ${entity.name}`}
        className="group block w-full text-left rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700] disabled:cursor-wait"
      >
        <div
          className={`relative mx-auto aspect-[3/4] w-[min(100%,calc(min(22dvh,168px)*0.75))] overflow-hidden rounded-md border bg-zinc-950 shadow-[0_16px_40px_rgba(0,0,0,0.45)] sm:w-[min(100%,calc(min(26dvh,210px)*0.75))] lg:w-[188px] ${
            emphasis === "chosen"
              ? "border-[#FFD700] shadow-[0_0_0_1px_rgba(255,215,0,0.35),0_18px_40px_rgba(0,0,0,0.5)]"
              : "border-white/10"
          }`}
        >
          {showImage ? (
            <Image
              src={entity.imageUrl!}
              alt=""
              fill
              priority={priority}
              sizes={FACEOFF_IMAGE_SIZES}
              className="object-cover object-top"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(255,215,0,0.14),transparent_55%),#090909] px-2 text-center">
              <span className="text-3xl leading-none text-[#FFE9A0]" style={DISPLAY}>{initials(entity.name)}</span>
            </div>
          )}
        </div>
        <h2 className="mt-2 line-clamp-2 text-center text-[15px] leading-tight text-white sm:text-lg" style={DISPLAY}>
          {entity.name}
        </h2>
        {film ? (
          <p className="mt-0.5 line-clamp-2 text-center text-[11px] leading-snug text-zinc-400">{film}</p>
        ) : null}
        {entity.type === "performance" && entity.character ? (
          <p className="mt-0.5 line-clamp-1 text-center text-[11px] text-[#FFD700]/80">as {entity.character}</p>
        ) : null}
        {actorNote ? (
          <p className="mt-0.5 line-clamp-1 text-center text-[11px] text-zinc-500">{actorNote}</p>
        ) : null}
      </button>
    </article>
  )
}
