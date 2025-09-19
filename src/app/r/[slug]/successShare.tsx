"use client"
import React from 'react'
import { Share2 } from 'lucide-react'

export function SuccessShare({ feedUrl, storyUrl, pageUrl, xText }: { feedUrl?: string; storyUrl?: string; pageUrl: string; xText: string }) {
  async function handleSystemShare() {
    if ((navigator as any).share) {
      await (navigator as any).share({ title: 'ActorRating', text: xText, url: pageUrl })
    } else {
      await navigator.clipboard.writeText(pageUrl)
      alert('Link copied')
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(pageUrl)}`} target="_blank" className="px-4 py-2 rounded bg-black text-white text-center">Share on X</a>
      <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.6)] hover:shadow-[0_0_18px_rgba(217,70,239,0.8)] transition-shadow" onClick={handleSystemShare}>
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>
      <button className="px-4 py-2 rounded bg-gray-800 text-white" onClick={async () => { await navigator.clipboard.writeText(pageUrl); alert('Link copied') }}>Copy Link</button>
      {feedUrl ? <a className="px-4 py-2 rounded border text-center" href={feedUrl} download>Instagram Feed</a> : null}
      {storyUrl ? <a className="px-4 py-2 rounded border text-center" href={storyUrl} download>Instagram Story</a> : null}
    </div>
  )
}

