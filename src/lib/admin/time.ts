const dateTimeFormatter = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

export function formatAdminDateTime(date: Date): string {
  return dateTimeFormatter.format(date).replace(" ", " ")
}

export function formatRelativeTime(date: Date): string {
  const diffMs = date.getTime() - Date.now()
  const diffSeconds = Math.round(diffMs / 1000)
  const absSeconds = Math.abs(diffSeconds)
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  if (absSeconds < 60) return rtf.format(diffSeconds, "second")
  const minutes = Math.round(diffSeconds / 60)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour")
  const days = Math.round(hours / 24)
  return rtf.format(days, "day")
}
