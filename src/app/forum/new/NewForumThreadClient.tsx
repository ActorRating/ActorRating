"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { HomeLayout } from "@/components/layout"
import { useSession } from "@/components/providers/SessionProvider"
import { FORUM_POST_MAX_LENGTH, FORUM_TITLE_MAX_LENGTH } from "@/lib/forum/validation"

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
}

export default function NewForumThreadClient() {
  const { user, loading } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetCategory = searchParams.get("category") ?? ""

  const [categories, setCategories] = useState<Category[]>([])
  const [categorySlug, setCategorySlug] = useState(presetCategory)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void fetch("/api/forum/categories")
      .then((r) => r.json())
      .then((data: { categories?: Category[] }) => {
        const list = data.categories ?? []
        setCategories(list)
        setCategorySlug((prev) => prev || list[0]?.slug || "")
      })
      .catch(() => setError("Could not load categories"))
  }, [])

  useEffect(() => {
    if (presetCategory) setCategorySlug(presetCategory)
  }, [presetCategory])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug,
          title,
          content,
          isSpoiler,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        thread?: { slug: string }
      }
      if (!res.ok || !data.thread) {
        setError(data.error || "Could not create thread")
        return
      }
      router.push(`/forum/t/${data.thread.slug}`)
    } catch {
      setError("Could not create thread")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <HomeLayout>
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="text-xs text-zinc-500 mb-6">
            <Link href="/forum" className="hover:text-[#FFD700]">
              Forum
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-300">New thread</span>
          </nav>

          <h1 className="text-3xl font-black tracking-tight mb-8">Start a debate</h1>

          {loading ? (
            <p className="text-zinc-500">Loading…</p>
          ) : !user ? (
            <div className="space-y-4">
              <p className="text-zinc-400">Sign in to start a thread.</p>
              <Link
                href="/auth/signin?callbackUrl=/forum/new"
                className="inline-flex text-sm font-bold uppercase tracking-wide text-[#FFD700] hover:underline"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Category
                </span>
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="w-full rounded-sm border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm text-white"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Title
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={FORUM_TITLE_MAX_LENGTH}
                  placeholder="e.g. Best Joker: Ledger vs. Phoenix"
                  className="w-full rounded-sm border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Opening post
                </span>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={FORUM_POST_MAX_LENGTH}
                  rows={8}
                  placeholder="Make your case…"
                  className="w-full rounded-sm border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 resize-y"
                  required
                />
                <span className="text-[11px] text-zinc-600">
                  {content.length}/{FORUM_POST_MAX_LENGTH}
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={isSpoiler}
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                  className="rounded border-white/20"
                />
                Contains spoilers
              </label>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-sm px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-60"
                style={{ background: "linear-gradient(90deg, #FFD700, #FFA500)" }}
              >
                {submitting ? "Posting…" : "Post thread"}
              </button>
            </form>
          )}
        </div>
      </main>
    </HomeLayout>
  )
}
