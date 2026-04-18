const POPULAR_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "protonmail.com",
  "aol.com",
  "mail.com",
  "yandex.com",
  "gmx.com",
  "zoho.com",
  "live.com",
  "msn.com",
  "rediffmail.com",
  "mail.ru",
]

/** Stricter email checks used on auth forms (matches sign-in UX). */
export function validateEmailDetailed(email: string): { isValid: boolean; error?: string } {
  if (!email) {
    return { isValid: false, error: "Email is required" }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) {
    if (email.includes("@") && !email.includes(".")) {
      return { isValid: false, error: "Email must include a domain (e.g., @gmail.com)" }
    }
    if (email.includes(".") && !email.includes("@")) {
      return { isValid: false, error: "Email must include @ symbol" }
    }
    if (email.includes(" ")) {
      return { isValid: false, error: "Email cannot contain spaces" }
    }
    return { isValid: false, error: "Please enter a valid email address" }
  }

  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) {
    return { isValid: false, error: "Email must include a domain" }
  }

  const isPopularDomain = POPULAR_EMAIL_DOMAINS.some(
    (popular) => domain === popular || domain.endsWith(`.${popular}`),
  )

  if (!isPopularDomain) {
    const commonTypos: Record<string, string> = {
      "gmial.com": "gmail.com",
      "gmaill.com": "gmail.com",
      "gmai.com": "gmail.com",
      "yahooo.com": "yahoo.com",
      "yaho.com": "yahoo.com",
      "outlok.com": "outlook.com",
      "outllook.com": "outlook.com",
      "hotmial.com": "hotmail.com",
      "hotmai.com": "hotmail.com",
      "hotmali.com": "hotmail.com",
    }

    const typoFix = commonTypos[domain]
    if (typoFix) {
      return { isValid: false, error: `Did you mean @${typoFix}?` }
    }

    const domainParts = domain.split(".")
    if (domainParts.length >= 2 && domainParts[domainParts.length - 1].length >= 2) {
      return { isValid: true }
    }

    return { isValid: false, error: "Please use a valid email service (e.g., Gmail, Yahoo, Outlook)" }
  }

  return { isValid: true }
}
