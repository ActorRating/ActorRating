import { Geist_Mono } from "next/font/google"

/**
 * Loaded only from route layouts that render `font-mono` UI
 * (admin, dashboard, methodology, rate). Not on the root layout.
 */
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})
