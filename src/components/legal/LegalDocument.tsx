"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

const DISPLAY: React.CSSProperties = {
  fontFamily:
    'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
}
const SANS: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans), var(--font-sans), system-ui, sans-serif",
}

export type LegalSection = {
  title: string
  content: string
  list?: string[]
}

export type LegalDocContent = {
  title: string
  lastUpdated: string
  intro?: string
  sections: LegalSection[]
}

function sectionId(title: string, index: number) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48)
  return `s-${index}-${slug || "section"}`
}

function navLabel(title: string) {
  return title.replace(/^\d+(\.\d+)?\.?\s*/, "").trim()
}

export function LegalDocument({
  documents,
  relatedLinks,
}: {
  documents: { en: LegalDocContent; tr: LegalDocContent }
  relatedLinks?: Array<{ href: string; label: string }>
}) {
  const [language, setLanguage] = useState<"en" | "tr">("en")
  const doc = documents[language]

  const nav = useMemo(
    () =>
      doc.sections.map((section, index) => ({
        id: sectionId(section.title, index),
        label: navLabel(section.title),
      })),
    [doc.sections],
  )

  return (
    <div className="min-h-screen bg-black w-full" style={SANS}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 lg:px-10 pt-28 sm:pt-32 pb-20 sm:pb-28">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10 sm:mb-12">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-600">
            Legal
          </p>
          <div className="flex items-center gap-2">
            {(["en", "tr"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1.5 text-xs font-semibold tracking-wider uppercase rounded-md border transition-colors ${
                  language === lang
                    ? "bg-[#FFD700] text-black border-[#FFD700]"
                    : "bg-transparent text-zinc-500 border-white/10 hover:text-[#FFD700] hover:border-[#FFD700]/40"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <header className="mb-12 sm:mb-16 max-w-2xl">
          <h1
            className="text-4xl sm:text-5xl md:text-[3.25rem] font-bold text-white tracking-tight leading-[1.15]"
            style={DISPLAY}
          >
            {doc.title}
          </h1>
          <p className="mt-4 text-sm text-zinc-500">
            {doc.lastUpdated}{" "}
            {new Date().toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {doc.intro ? (
            <p className="mt-6 text-[15px] sm:text-base text-zinc-400 leading-[1.75]">
              {doc.intro}
            </p>
          ) : null}
          {relatedLinks && relatedLinks.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-zinc-500 hover:text-[#FFD700] transition-colors underline underline-offset-4 decoration-white/15 hover:decoration-[#FFD700]/50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </header>

        <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14 xl:gap-20 lg:items-start">
          <aside className="mb-10 lg:mb-0 lg:sticky lg:top-28 lg:self-start lg:z-20">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-600 mb-3 px-2">
              On this page
            </p>
            <nav
              aria-label="Document sections"
              className="border-b border-white/[0.08] pb-5 lg:border-0 lg:pb-0"
            >
              <ul className="flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto pr-1">
                {nav.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block px-2 py-2 text-sm text-zinc-500 hover:text-[#FFD700] transition-colors rounded-md"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0 max-w-2xl">
            {doc.sections.map((section, index) => {
              const id = sectionId(section.title, index)
              return (
                <section
                  key={id}
                  id={id}
                  className="scroll-mt-28 mb-12 sm:mb-14 last:mb-0"
                >
                  <div className="mb-5 sm:mb-6">
                    <h2
                      className="text-xs font-semibold tracking-[0.18em] uppercase text-[#FFD700]"
                      style={SANS}
                    >
                      {section.title}
                    </h2>
                    <div className="mt-3 h-px w-full bg-zinc-700" aria-hidden />
                  </div>
                  <h3
                    className="text-[1.35rem] sm:text-[1.6rem] font-bold text-white leading-[1.25] tracking-tight"
                    style={DISPLAY}
                  >
                    {navLabel(section.title)}
                  </h3>
                  <div className="mt-4 text-[15px] sm:text-[16px] text-zinc-400 leading-[1.75] space-y-4">
                    <p>{section.content}</p>
                    {section.list && section.list.length > 0 ? (
                      <ul className="space-y-2.5 list-none pl-0">
                        {section.list.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex gap-3">
                            <span
                              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFD700]/80"
                              aria-hidden
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              )
            })}

            <div className="mt-16 pt-8 border-t border-white/[0.08]">
              <p className="text-sm text-zinc-500 leading-relaxed">
                Questions about this document? Email{" "}
                <a
                  href="mailto:contact@actorrating.com"
                  className="text-[#FFD700] hover:underline"
                >
                  contact@actorrating.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
