import type { ReactNode } from "react"
import { geistMono } from "@/lib/fonts-mono"

export default function MethodologyLayout({ children }: { children: ReactNode }) {
  return <div className={geistMono.variable}>{children}</div>
}
