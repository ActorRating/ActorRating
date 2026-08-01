"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { type AdminTabId } from "@/lib/admin/tabs"

const TABS: Array<{ id: AdminTabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "traffic", label: "Traffic" },
  { id: "x", label: "X" },
  { id: "users", label: "Users" },
  { id: "ratings", label: "Ratings" },
]

export default function AdminTabs({ active }: { active: AdminTabId }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(tab: AdminTabId) {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    if (tab === "overview") params.delete("tab")
    else params.set("tab", tab)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-secondary/40 p-1">
      {TABS.map((tab) => {
        const isActive = active === tab.id
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
