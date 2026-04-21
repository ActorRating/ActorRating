"use client"

import { useState } from "react"

type Props = {
  profileUrl: string
}

export default function CopyProfileLinkButton({ profileUrl }: Props) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
    >
      {copied ? "Copied!" : "Copy profile link"}
    </button>
  )
}

