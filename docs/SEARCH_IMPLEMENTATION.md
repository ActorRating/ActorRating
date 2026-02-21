# Complete Search Implementation (Autocomplete & Full Search)

This document describes the full search stack: preload index, client-side autocomplete, server suggestions, and the full search results page.

---

## Overview

| Layer                  | Purpose                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Preload**            | Load once: top 300 actors + 300 movies by popularity. Cached in memory and optionally in `window.__SEARCH_PRELOAD__`. |
| **Local filter**       | On every keystroke: filter preload in-memory (no request). Instant dropdown.                                          |
| **Server suggestions** | After 60ms debounce: replace dropdown with DB-backed suggestions (token + trigram).                                   |
| **Full search**        | On “View all” or Enter with no selection: `/search?q=…` uses full search API and shows results page.                  |

---

## 1. API Routes

### `GET /api/search/preload`

- **File:** `src/app/api/search/preload/route.ts`
- **Returns:** `{ actors: Array<{ id, name, slug }>, movies: Array<{ id, title, slug, year }> }`
- **Limit:** 300 actors, 300 movies, ordered by performance count (popularity).
- **Cache:** In-memory (Redis) 10 min; response `Cache-Control: max-age=300, s-maxage=600, stale-while-revalidate=900`.
- **Used by:** `SearchPreloadTrigger` on app load; `SearchBar` on mount/focus if cache empty.

### `GET /api/search/suggestions?q=...`

- **File:** `src/app/api/search/suggestions/route.ts`
- **Returns:** `{ actors: SearchActor[], movies: SearchMovie[] }` (same shape as preload items).
- **Limit:** 8 actors, 8 movies.
- **Matching:** All tokens must appear in name/title (any order); prefix-friendly. If no token matches and `q.length >= 2`, fallback to PostgreSQL `similarity()` (trigram).
- **Cache:** Redis 60s; response `Cache-Control: max-age=30, s-maxage=60, stale-while-revalidate=120`.
- **Used by:** `SearchBar` after 60ms debounce to replace local suggestions with server results.

### `GET /api/search?q=...` (full search, no `suggestions`)

- **File:** `src/app/api/search/route.ts`
- **Returns:** `{ actors: Array<...>, movies: Array<...> }`. Requires `q` and at least 2 characters.
- **Matching:** Full-text (`plainto_tsquery`), trigram `similarity() > 0.2`, and `ILIKE %q%`; combined with priority (exact > fuzzy > partial). Limit 10 actors, 10 movies.
- **Cache:** Redis 60s; response `Cache-Control: max-age=60, s-maxage=300, stale-while-revalidate=600`.
- **Used by:** Search results page when user goes to `/search?q=...`.

### `GET /api/search?q=...&suggestions=true`

- Same file as above. Allows 1+ character; same ranking (prefix / contains / similarity). Limit 8 each. Used if something calls the main search route in “suggestions” mode (SearchBar uses `/api/search/suggestions` instead).

---

## 2. Frontend Components

### `SearchBar` — `src/components/SearchBar.tsx`

- **Props:** `placeholder`, `className`, `onSearch`, `initialValue`, `showClear`, `autoFocus`, `showSuggestions`, `disableAutoScrollOnFocus`.
- **State:** `query`, `isFocused`, `suggestions` (actors + movies), `highlightedIndex`, `navigating`, `preload`.
- **Module-level cache:** `preloadCache`, `normalizedPreloadCache` (with `_name` / `_title` lowercase) so all instances share one preload.

**Flow:**

1. **Preload:** On mount and on focus, `ensurePreload()`: use `preloadCache` or `window.__SEARCH_PRELOAD__` or fetch `GET /api/search/preload`; normalize and set `preload` / `normalizedPreloadCache`.
2. **Inline autocomplete:** Single best prefix match from preload (actor then movie). Shown as gray suffix when `query === query.trim()` and match exists. Accept with **Tab**, **ArrowRight**, or **Enter** → fill input and navigate to actor/movie page.
3. **Dropdown (instant):** When `isFocused && showSuggestions && query.trim().length >= 1`:
   - **Immediate:** Filter `normalizedPreloadCache` by tokens (all tokens in name/title, any order); rank: starts-with (0) > word-start (1) > contains (2) > all-tokens (3). Take up to 4 actors + 4 movies (`LOCAL_LIMIT`), set `suggestions`.
   - **After 60ms:** Fetch `GET /api/search/suggestions?q=...`; on response, if query unchanged, set `suggestions` to server result (replacing local).
4. **Keyboard:** ArrowDown/ArrowUp move highlight; Enter submits (select highlighted or first suggestion, or go to search page if no suggestions). Escape closes. Space adds space without scrolling when dropdown open.
5. **Submit (form or Enter):**
   - If exact match in current suggestions → navigate to that actor/movie.
   - Else if highlighted or first suggestion → navigate to that.
   - Else if query non-empty and no suggestions → `onSearch(query)` or `router.push(/search?q=...)`.
   - Clicking a suggestion or accepting inline completion navigates to actor/movie URL (via `getActorUrl` / `getMovieUrl`).
6. **“View all X results”:** Link to `/search?q=...`; closing dropdown is handled on click.

**Constants:** `DEBOUNCE_MS = 60`, `MAX_SUGGESTIONS = 8`, `LOCAL_LIMIT = 4`.

### `SearchPreloadTrigger` — `src/components/SearchPreloadTrigger.tsx`

- Renders nothing. On mount, if `window.__SEARCH_PRELOAD__` is not set, fetches `GET /api/search/preload` and sets `window.__SEARCH_PRELOAD__` so any `SearchBar` that mounts later gets instant preload without a second request.
- **Used in:** `src/app/layout.tsx` (root layout).

---

## 3. Search Results Page

- **File:** `src/app/search/page.tsx`
- **URL:** `/search`, optional `?q=...`.
- Renders `SearchBar` with `initialValue={query}`, `autoFocus`, `disableAutoScrollOnFocus`.
- When `query` is present, calls `GET /api/search?q=...` (full search, no `suggestions` param), then shows a grid of actors and movies (links to actor/movie pages). Loading state and “No results” are handled.

---

## 4. Types

- **File:** `src/types/index.ts`
- `SearchActor`: `{ id, name, slug? }`
- `SearchMovie`: `{ id, title, slug?, year }`
- `NewSearchResult`: `{ actors: SearchActor[], movies: SearchMovie[] }`

---

## 5. Helpers

- **URLs:** `src/lib/slugHelper.ts` — `getActorUrl(actor)`, `getMovieUrl(movie)` (slug-based routes).
- **Cache:** `src/lib/cache.ts` — `cacheGet`, `cacheSet`, `makeCacheKey` (used by all three search API routes).

---

## 6. Where SearchBar Is Used

- Dashboard: `src/app/dashboard/DashboardClient.tsx`
- Search page: `src/app/search/page.tsx`
- Performances: `src/app/performances/PerformancesPageClient.tsx`
- Rate flow: `src/app/rate/page.tsx`, `src/app/onboarding/rate/page.tsx`
- Nav: “Search” links to `/search` (e.g. `SignedInNavbar`)

---

## 7. Summary Table

| Piece           | File / Route                        | Role                                                                             |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| Preload API     | `GET /api/search/preload`           | Top 300 actors + 300 movies, once per app/session                                |
| Suggestions API | `GET /api/search/suggestions?q=`    | 8+8 token + trigram suggestions after debounce                                   |
| Full search API | `GET /api/search?q=`                | 10+10 for search results page                                                    |
| Preload trigger | `SearchPreloadTrigger.tsx` + layout | Populate `window.__SEARCH_PRELOAD__` on load                                     |
| SearchBar       | `SearchBar.tsx`                     | Preload + local filter + suggestions + inline autocomplete + keyboard + navigate |
| Search page     | `src/app/search/page.tsx`           | Full search results and SearchBar with `?q=`                                     |

Together this is the **complete search implementation**: one preload, instant autocomplete from local filter, server-backed suggestions after debounce, and full search with autocomplete and everything on the results page.
