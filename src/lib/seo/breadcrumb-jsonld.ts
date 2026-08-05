type BreadcrumbItem = {
  name: string
  path: string
}

/**
 * JSON-LD BreadcrumbList for SSR pages.
 */
export function breadcrumbJsonLd(baseUrl: string, items: BreadcrumbItem[]) {
  const base = baseUrl.replace(/\/$/, "")
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path.startsWith("http") ? item.path : `${base}${item.path.startsWith("/") ? "" : "/"}${item.path}`,
    })),
  }
}
