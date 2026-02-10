# Search autocomplete: load index once, filter locally

**Rule:** Typing must never feel like a request. Autocomplete is 100% client-side from a small in-memory index. Full data loads only after the user clicks a suggestion.

---

## Architecture

1. **Load a small search index once**  
   `GET /api/search/preload` returns top 100 actors + 100 movies (id, name/title, slug, year for movies). Fetched on **mount** and **focus**; stored in module-level `GLOBAL_PRELOAD` so every SearchBar is warm after the first load.

2. **Normalize once**  
   When the index is received, each item gets a normalized field: `_name` / `_title` = lowercase + accents removed (`normalize("NFD")` + strip diacritics). No per-keystroke normalization.

3. **Filter locally on every keystroke**  
   No database or API call while typing. On each change we run `localFilter(query)` over the in-memory index. Suggestions update instantly; no loading state, no debounce for the UI.

4. **Full data only on click**  
   Clicking a suggestion (or Enter on a highlighted row) navigates to the actor/movie page, where the full record is loaded server-side. The autocomplete never fetches full objects.

---

## Matching and ranking (client-side)

- **Partial matches**: Query substring in normalized title/name.
- **Any word order**: Multi-word query (e.g. `"dicaprio leonardo"`) matches if every token appears in the text (in any order).
- **Simple fuzzy**: If no substring match, use subsequence match (query chars appear in order in the text) for typo tolerance.
- **Ranking**:  
  0 = title/name starts with query  
  1 = all tokens match and each token is a word-start  
  2 = all tokens match (any position)  
  3 = single-token contains  
  4 = subsequence (fuzzy)  
  Tie-breaker: preload order (popularity).

First character: actors only (up to 4). Two+ characters: up to 4 actors + 4 movies (max 8 total).

---

## What was wrong before (and why it’s fixed)

| Problem | Fix |
|--------|-----|
| DB/API on every keystroke | **No server during typing.** Index loaded once; all filtering is local. |
| ILIKE on big tables per key | **No per-keystroke queries.** One preload request; then only in-memory filter. |
| Waiting for server before showing suggestions | **Suggestions = `localFilter(query)`.** No waiting. |
| Full objects in autocomplete | **Index is minimal** (id, name/title, slug, year). Full data only on navigation. |
| Debounce/race conditions | **No network to debounce.** Single synchronous filter run per keystroke. |
| No preload | **Preload on mount + focus;** global cache so every bar reuses the same index. |

---

## UX

- Suggestions update on every keystroke (instant).
- No loading spinner; no “searching…” state.
- Clearing the input clears suggestions immediately.
- Keyboard: ↑ ↓ to move, Enter to select; Escape to close.
- Max 5–8 suggestions (4 actors + 4 movies).
- No highlighting logic; no animations that block rendering. Speed over visuals.

---

## Files

- **Frontend**: `src/components/SearchBar.tsx` — preload once, `normalize()` + `localFilter()` only; no `performSearch` during typing; keyboard nav.
- **Backend**: `src/app/api/search/preload/route.ts` — lightweight index (top 100 actors + 100 movies by popularity), cached 10 min. Only endpoint used for autocomplete.
- **Backend**: `src/app/api/search/route.ts` — full search page (e.g. “View all results” → `/search?q=…`).
- **Backend**: `src/app/api/search/suggestions/route.ts` — optional; not used by SearchBar in the “index-only” flow.
