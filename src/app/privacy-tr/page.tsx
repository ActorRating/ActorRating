import { redirect } from "next/navigation"

/** Canonical privacy policy is bilingual at /privacy. */
export default function PrivacyTrRedirect() {
  redirect("/privacy")
}
