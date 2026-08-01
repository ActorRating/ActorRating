export type AdminTabId = "overview" | "traffic" | "x" | "users" | "ratings"

export function parseAdminTab(raw: string | undefined): AdminTabId {
  if (raw === "traffic" || raw === "x" || raw === "users" || raw === "ratings") {
    return raw
  }
  return "overview"
}
