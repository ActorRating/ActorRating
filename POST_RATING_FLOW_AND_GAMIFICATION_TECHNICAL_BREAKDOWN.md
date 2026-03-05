# Post-Rating Flow & Gamification — Full Technical Breakdown

This document describes the current implementation of the rating submission flow, progress/level system, badges, community comparison, share system, and next-performance logic. Use it to redesign for “momentum mode” (rapid consecutive ratings) without breaking existing behavior.

---

## 1. Rating Submission Flow

### 1.1 Components involved after a rating is submitted

| Layer | File(s) | Role |
|-------|--------|------|
| **Form + submit handler** | `src/components/rating/PerformanceRatingClientWrapper.tsx` | Single component: sliders, submit button, and success overlay. Calls `onSubmit(ratingData)` (parent-provided). |
| **API** | `src/app/api/ratings/route.ts` (POST/PUT), `src/app/api/ratings/[id]/route.ts` (PUT) | Persist rating; return created/updated rating. No `revalidatePath` (removed for cost). |
| **Parent callers** | `RatePageClient.tsx`, `rate/page.tsx`, `onboarding/rate/page.tsx`, `performances/[id]/page.tsx`, `MovieRatingSection.tsx` | Provide `onSubmit` that calls `fetch('/api/ratings', …)` or `ratingsApi.create/update`, then the wrapper runs its internal success sequence. |

Flow: User submits → wrapper sets `submitPhase` to `'loading'` → `onSubmit` runs (API) → wrapper sets `'checkmark'` then `'success'` → full-screen success overlay is shown; progress is fetched and overlay content (headline, progress bar, badges, “Rate another”) is rendered.

### 1.2 Which files handle the success state

- **Primary:** `PerformanceRatingClientWrapper.tsx`  
  - Holds `submitPhase: 'idle' | 'loading' | 'checkmark' | 'success'`.  
  - On success it shows the full-screen overlay (fixed, z-9999), sets `finalScore`, fetches `/api/user/level-progress`, computes `progressData` and `userBadges`, and picks a random success headline via `getRandomSuccessMessage(finalScore, communityAvg10, communityRatingCount)`.

- **Secondary (other entry points):**  
  - **Rate index** (`src/app/rate/page.tsx`): Uses `submitted`, `submittedRating` state; when `submittedParam` (from `?submitted=true`) and `sessionStorage.submittedRating` are present, it passes `submittedRating` into the wrapper as `submittedRating` prop so the wrapper opens in `submitPhase === 'success'`.  
  - **Onboarding rate** (`src/app/onboarding/rate/page.tsx`): Own `submitted` / `submittedRating`; passes `submittedRating` into wrapper for success card.  
  - **Performances detail** (`src/app/performances/[id]/page.tsx`): Uses `submitted` / `submittedFromQuery`; on success it renders a separate full-page success view (“Rating Submitted Successfully!”) instead of using the wrapper’s overlay.  
  - **Auth success** (`signin-success`, `signup-success`): After submitting a pending rating, they put the result in `sessionStorage.submittedRating` and redirect to `/rate?actor=…&movie=…&submitted=true` so the rate page shows the success card.

### 1.3 Where the full-screen overlay is triggered

- **File:** `src/components/rating/PerformanceRatingClientWrapper.tsx`  
- **Condition:** `submitPhase === 'success' && finalScore !== null`.  
- **Location in JSX:** Inside `<AnimatePresence>`, a `motion.div` with `className="fixed inset-0 z-[9999] …"` (backdrop + centered card).  
- **Trigger path:** In `handleSubmit`: after `onSubmit(ratingData)` resolves, two timeouts run:  
  - ~200ms: `setSubmitPhase('checkmark')`  
  - ~350ms: `setSubmitPhase('success')`, then `fetchUserProgress()`, body scroll lock, and `onSuccess?.(ratingData)`.

So the overlay is **entirely controlled** by `submitPhase` and `finalScore` inside the wrapper.

### 1.4 State variables that control submitPhase

- **Single source of truth:** `submitPhase` in `PerformanceRatingClientWrapper` (useState).  
- **Transitions:**  
  - `'idle'` → user clicks Submit → `'loading'` (line ~1211).  
  - After `onSubmit` resolves → `'checkmark'` (line ~1229, after 200ms minus elapsed).  
  - Then → `'success'` (line ~1235, after 350ms minus elapsed).  
  - On error or “user not signed in” → reset to `'idle'` (lines ~1281, 1290).  
- **Initial:** If the parent passes `externalSubmittedRating` (e.g. from sessionStorage + `?submitted=true`), wrapper initializes `submitPhase` to `'success'` and sets `finalScore` from that rating (lines ~789, 814–825).

No other component sets `submitPhase`; it’s local to the wrapper.

### 1.5 How navigation back to #filmography is done

- **Handler:** `handleContinueRating` in `PerformanceRatingClientWrapper.tsx`. When the user clicks the overlay’s “Rate another” button or the X close button, it calls `doNavigateToActorPage()`.  
- **Implementation of `doNavigateToActorPage`:**  
  - Sets `sessionStorage.refreshActorRatings` to `performance.actor.id` (and optionally `refreshActorRatingsSlug` to actor slug).  
  - Then `router.push(\`${actorUrl}#filmography\`)` where `actorUrl` comes from `getActorUrl(performance.actor)` (slug or id).  
- **Actor page reaction:** `ActorPageClient.tsx` (and the static UUID actor pages) on load check `sessionStorage.getItem('refreshActorRatings')` (and `refreshActorRatingsSlug`). If the value matches the current actor id/slug, they clear those keys and refetch `/api/actors/[id]/user-rating` so the filmography list reflects the new rating (e.g. “Edit” instead of “Rate”).

So: **navigation is always to the actor page with hash `#filmography`**; the actor page uses sessionStorage to know it should refresh user ratings.

### 1.6 Where sessionStorage is used and why

| Key | Set in | Read in | Purpose |
|-----|--------|--------|---------|
| `submittedRating` | `signin-success`, `signup-success` after POST rating | `rate/page.tsx` when `?submitted=true` | Hold the created rating so the rate page can show the success card (wrapper receives it as `submittedRating` and starts in `submitPhase === 'success'`). |
| `refreshActorRatings` | `PerformanceRatingClientWrapper.doNavigateToActorPage()` | `ActorPageClient.tsx` (and static actor pages) | Signal “just came from rate page; refetch user ratings for this actor” so filmography shows updated state. |
| `refreshActorRatingsSlug` | Same as above | Same | Same, keyed by actor slug when applicable. |
| `pendingRating` | Signup flow when user rates before account exists | `signin-success`, `signup-success` | Persist rating payload to submit after auth; then cleared and `submittedRating` set. |
| `ratingFeedback` | (optional) | `ActorPageClient`, `MoviePageClient` | Optional feedback message after rating (if used). |

SessionStorage is used to **bridge redirects** (auth → rate page with success; rate page → actor page with refresh) without adding URL params or new API endpoints.

---

## 2. Progress & Level System

### 2.1 How `/api/user/level-progress` works

- **File:** `src/app/api/user/level-progress/route.ts`.  
- **Auth:** Requires Supabase `getUser()`; 401 if no user.  
- **Logic:**  
  - Counts ratings: `prisma.rating.count({ where: { userId: user.id } })`.  
  - Determines “first rater”: `prisma.rating.findFirst({ orderBy: { createdAt: 'asc' } })` and compares `userId`, or checks a hardcoded list of user IDs.  
  - Calls **`@/lib/levels`**: `getLevelInfo(ratingCount)`, `getNextLevelName()`, `calculateProgress()`, `getRatingsNeeded()`.  
- **Response:**  
  `ratingCount`, `level`, `levelEmoji`, `nextLevel`, `currentLevelMin`, `nextLevelAt`, `progressPercent`, `ratingsNeeded`, `isFirstRater`.  
  **Note:** Does **not** return `isFoundingMember`; UI uses a TODO and defaults to false.

### 2.2 Where getLevelProgress is implemented

- **Two systems:**  
  - **API** uses `src/lib/levels.ts`: `getLevelInfo`, `calculateProgress`, `getRatingsNeeded`, `getNextLevelName` (level names and thresholds: Viewer 1–9, Critic 10–49, Senior Critic 50–199, Elite Critic 200+).  
  - **UI** uses `src/lib/badges.ts`: `getLevelProgress(ratingCount)` which returns `{ currentBadge, nextBadge, progress, ratingsNeeded }` using **badge** config (Viewer/Critic/Senior Critic/Elite Critic with same thresholds).  

So the API is driven by **levels** (names + numbers); the UI often re-derives progress from **badges** using the same `ratingCount` (e.g. in wrapper: `getLevelProgress(data.ratingCount)` after fetching level-progress).

### 2.3 How levels are calculated

- **Levels** (`lib/levels.ts`):  
  - Viewer: 1–9 ratings, next at 10.  
  - Critic: 10–49, next at 50.  
  - Senior Critic: 50–199, next at 200.  
  - Elite Critic: 200+, no next.  
- **Progress %:**  
  - Viewer: `(ratingCount / 10) * 100` (so 1 rating ≈ 10%).  
  - Others: `(ratingCount - levelMin) / (nextLevelAt - levelMin) * 100`.  
  - Elite: 100%.

### 2.4 Badge unlock thresholds

- **Defined in:** `src/lib/badges.ts`, `BADGE_CONFIGS`.  
- **Level badges:**  
  - Viewer: minRatings 1, maxRatings 9.  
  - Critic: 10–49.  
  - Senior Critic: 50–199.  
  - Elite Critic: 200+, no max.  
- **Special badges:** First Rater, Founding Member (no threshold; shown if `isFirstRater` / `isFoundingMember`).

### 2.5 Are badge rules hardcoded or database-driven?

- **Fully hardcoded.** All thresholds and badge metadata live in `BADGE_CONFIGS` and in `lib/levels.ts`. There is no DB table or admin API for badge definitions. Changing thresholds or adding a new level requires a code change and deploy.

### 2.6 How progress percentage is calculated

- **In API (levels):** `calculateProgress(ratingCount, levelInfo)` in `lib/levels.ts` (see 2.3).  
- **In UI (badges):** `getLevelProgress(ratingCount)` in `lib/badges.ts`:  
  - Finds current and next level badge by `minRatings` / `maxRatings`.  
  - For Viewer: `progress = (ratingCount / nextMin) * 100`.  
  - For other levels: `progress = (ratingCount - currentMin) / (nextMin - currentMin) * 100`.  
  - Returns `progress` 0–100 and `ratingsNeeded` to next badge.

---

## 3. Badge System

### 3.1 Where badges are defined

- **File:** `src/lib/badges.ts`.  
- **Export:** `BADGE_CONFIGS: BadgeConfig[]` (array of `{ id, name, type, color, textColor, minRatings?, maxRatings?, icon?, iconName?, animated? }`).  
- **Types:** `'founding-member' | 'level' | 'first-rater'`.

### 3.2 How they are stored (DB / enum / config)

- **Static config only.** No DB table. No enum in the database. All badge definitions are in `BADGE_CONFIGS`. First Rater / Founding Member are determined at runtime (API or hardcoded IDs); level badge is derived from `ratingCount` via `getLevelBadge(ratingCount)`.

### 3.3 How the UI decides which badge to show

- **Success overlay:** After fetch of `/api/user/level-progress`, wrapper calls `getUserBadges(data.ratingCount, false, data.isFirstRater)` and sets `userBadges`. Renders `<Badge badge={…} />` for each.  
- **Progress modal:** `ProgressModal` uses `getLevelBadge(ratingCount)` for current and `getLevelProgress(ratingCount).nextBadge` for next; also lists all level badges from `BADGE_CONFIGS` with unlock state.  
- **Dashboard / profile:** `UserBadges` fetches level-progress, then `getUserBadges(ratingCount, isFoundingMember, isFirstRater)` and renders badges.  
- **Component:** `src/components/badges/Badge.tsx` renders a single `BadgeConfig` (color, icon, name, optional animation).

### 3.4 Support for multiple badge types (style vs volume)

- **Types exist:** `first-rater`, `founding-member`, `level`.  
- **Display:** All are rendered with the same `Badge` component; differentiation is by `color`, `iconName`, `animated`. There is no separate “style” vs “volume” pipeline—only one list of badges per user (First Rater first, then Founding Member, then level).

### 3.5 Can badges update dynamically without redeploy?

- **No.** Thresholds and definitions are in code. To change levels or add badges you must change `lib/badges.ts` (and optionally `lib/levels.ts`) and redeploy. A future improvement would be to move badge config to DB or CMS and have the API return badge list/metadata.

---

## 4. Community Comparison

### 4.1 How “You rated X% harsher than other critics” is calculated

- **File:** `src/components/rating/PerformanceRatingClientWrapper.tsx`, `getRandomSuccessMessage(userScore, communityAvg, communityCount)`.  
- **Formula:**  
  - `diff = communityAvg - userScore` (both on 0–10 scale).  
  - `percent = round((|diff| / communityAvg) * 100)`.  
  - If `diff > 0.35`: user is “harsher” → one of the “X% harsher” messages.  
  - If `diff < -0.35`: user is “more generous” → one of the “X% higher” messages.  
  - Else: “in line with other critics”.  
- **Scale:** `userScore` and `communityAvg` are 0–10 in this function; the wrapper passes `communityAvg10` and `finalScore` (already /10).

### 4.2 Per performance or per actor?

- **Per performance.** The community average and count come from the **current performance** (one actor–movie pair). On the rate page, `communityAvg10` and `communityRatingCount` are fetched for that performance via `/api/performances/by-lookup` with a single target `{ actor: actor.name, movie: movie.title }`. So the message is “compared to other critics who rated **this** performance.”

### 4.3 Where the average is stored and updated

- **Not stored as a separate field.** The average is **computed on read** from the `Rating` table.  
- **By-lookup:** `getPerformancesByLookup` (used by `/api/performances/by-lookup`) resolves actor+movie to performance(s), then aggregates ratings for that performance (e.g. average of the five dimensions or `weightedScore`).  
- **Rate page:** Fetches that aggregate via by-lookup; `averageRating` (0–100) is converted to 0–10 for `communityAvg10`. So the “average” is derived from raw ratings whenever the API is called; no cached average table is updated on each new rating.

---

## 5. Share System

### 5.1 How share text is generated

- **File:** `PerformanceRatingClientWrapper.tsx`, inline.  
- **Variables:** `shareUrl` (either `/r/${slug}`, `/r/${id}`, or rate page URL), `shareText`.  
- **Logic:**  
  - If `finalScore !== null`: `"I gave {actor}'s performance in \"{movie}\" a {finalScore}/10. What's your rating? {url} — ActorRating"`.  
  - Else: `"Rate {actor}'s performance in \"{movie}\" {url} — ActorRating"`.  
  - If URL is slug-based (`/rate/...` without `?`), the URL is appended; otherwise only text.  
- **Native share:** `navigator.share({ title, text: shareText, url: shareUrl })`.  
- **Social:** Twitter/Facebook use the same `shareText` and `shareUrl` in intent URLs; Instagram copies an OG image URL to clipboard (no share text in app).

### 5.2 How the OG image is generated

- **Endpoint:** `GET /api/og?ratingId=...&size=og|feed|story` (optional: `actorName`, `movieTitle`, `score` for success-card sharing without a saved rating).  
- **File:** `src/app/api/og/route.ts`.  
- **Behavior:**  
  - If `actorName`, `movieTitle`, `score` are provided (e.g. from success card), uses them directly.  
  - Else resolves `ratingId` via Prisma (rating by id or composite); reads actor, movie, score (e.g. `shareScore` or `weightedScore`), role name.  
  - Renders **SVG** (Cinzel font, gold gradient, score, actor/movie text) then returns it as PNG (via a conversion step if applicable) with `Content-Type: image/png` and cache headers.  
- **Sizes:** `og` 1200×630, `feed` 1080×1350, `story` 1080×1920.

### 5.3 Is share data dynamic or precomputed?

- **Dynamic.** Share text is built in the client from current `performance`, `finalScore`, and `shareUrl`. OG image is generated on demand by the API from either query params (success card) or DB lookup by `ratingId`.  
- **Precomputed option:** `src/lib/shareGenerator.ts` can generate and upload OG images to storage (e.g. after a rating is created) and store URLs on the rating record; that path is used for persistent share pages (`/r/[slug]`). For the **success overlay** share buttons, the app typically uses the dynamic OG endpoint with params, not precomputed assets.

---

## 6. Next Performance Logic

### 6.1 Does the system know which performances a user has already rated?

- **Yes.**  
  - **Per actor:** `GET /api/actors/[id]/user-rating` returns all ratings for that actor for the current user (from cookies/JWT). Actor pages (e.g. `ActorPageClient`) store them in state (e.g. `userRatedMovies` or `userRatingsMap`) and use that to show “Rate” vs “Edit” and to scroll/highlight.  
  - **Per movie:** `GET /api/movies/[slug]/user-rating` does the same for that movie (user’s ratings for actors in that movie).  
  - **Global:** `GET /api/ratings/me` returns the current user’s ratings (e.g. used on rate page to prefill/edit and to know if user already rated this performance).

So “already rated” is always “query ratings by user + actor (or user + movie) and check actorId/movieId.”

### 6.2 Easy way to query the next unrated performance for the same actor?

- **Not implemented as a single API.** Today you have:  
  - Actor’s performances (from actor API or performances list).  
  - User’s ratings for that actor (`/api/actors/[id]/user-rating`).  
- **Client-side:** You can take the list of performances for the actor, subtract the set of `movieId`s (or performance ids) the user has rated, and pick the “next” one (e.g. first in list, or by some order). There is no dedicated “next unrated performance for this actor” endpoint.

### 6.3 Is that logic already partially implemented anywhere?

- **Partially.**  
  - **Actor page:** Has `userRatedMovies` (or equivalent) and a filmography list; it knows which rows are “Rate” vs “Edit” and can scroll to a card. It does **not** currently compute “next unrated” or auto-navigate to the next rate page.  
  - **After “Rate another”:** User is sent to actor page `#filmography` and must click another performance. There is no “Rate next” button that goes directly to `/rate/{movieSlug}/{actorSlug}` for the next unrated performance.  
So the **data** is there (user’s ratings per actor); the **UX** for “next unrated” (e.g. one-click to next performance) is not implemented.

---

## 7. Constraints (for redesign / momentum mode)

### 7.1 What breaks if we remove the full-screen success overlay?

- **Tight coupling:**  
  - **Progress and badges:** The overlay triggers `fetchUserProgress()` and displays `progressData` and `userBadges`. If you remove the overlay, you must show progress/badges somewhere else (e.g. a small toast, a persistent header, or the actor page) and still call the same API so level/badge state updates.  
  - **Community message:** The “X% harsher/generous” line is only shown in the overlay. If you drop the overlay, you need another place for that message (e.g. toast, inline under the form, or on the actor page).  
  - **Navigation:** “Rate another” and the X button both call `doNavigateToActorPage()` and set `refreshActorRatings`. If you remove the overlay, you need another way to navigate to filmography and trigger that refresh (e.g. immediate redirect, or a small “Rate another” link that does the same).  
- **What does NOT break:**  
  - API submission and persistence.  
  - Level/progress calculation (API and badges).  
  - SessionStorage for `refreshActorRatings` (as long as something still sets it before navigating to the actor page).  
  - Share: share text and OG can still be shown in a smaller card or copied without the overlay.

So: **removing the overlay is feasible** if you rehome (1) progress/badge display, (2) community comparison message, and (3) “continue to filmography” action (and refresh signal).

### 7.2 Tight couplings between UI, progress, and navigation

- **UI → progress:** Success overlay is the main place that fetches and shows level progress and badges after a rating. If you change the flow (e.g. no overlay), the same data can be fetched and shown elsewhere.  
- **UI → navigation:** Only the overlay’s “Rate another” / X call `doNavigateToActorPage()`. Any new flow (e.g. auto-redirect, or a compact bar) must replicate that call (and sessionStorage) so the actor page still refetches.  
- **Progress ↔ API:** Progress is not stored in DB; it’s always computed from `ratingCount`. So any screen that shows “N ratings to next level” or badges should call `/api/user/level-progress` (or at least have access to `ratingCount` and use `getLevelProgress`).  
- **No hard dependency:** Nothing in the API or DB requires the overlay to exist. The only requirement is that the client that wants to show progress/badges/community message and “go to filmography” has a way to do those three things.

---

## 8. Structured Overview

### Data flow

- **Submit:** Client → `POST/PUT /api/ratings` (or `/api/ratings/[id]`) → Prisma `Rating` table.  
- **Progress:** Client → `GET /api/user/level-progress` → `ratingCount` + levels (server) → UI uses `ratingCount` + `lib/badges.getLevelProgress` for badges and progress %.  
- **Community:** Client → `POST /api/performances/by-lookup` with one target → aggregate for that performance (avg, count) → success message.  
- **Already rated:** Client → `GET /api/actors/[id]/user-rating` or `/api/ratings/me` → list of ratings → client derives “rated” set per actor/movie.

### State flow

- **submitPhase:** Only in `PerformanceRatingClientWrapper`; drives loading → checkmark → success overlay.  
- **Progress/badges:** Fetched in wrapper after success and stored in wrapper state; also fetched in dashboard/profile/UserBadges.  
- **SessionStorage:** Bridges redirects (auth → rate success; rate → actor refresh).

### API flow

- **Rating:** `POST /api/ratings` or `PUT /api/ratings/[id]`.  
- **Level:** `GET /api/user/level-progress` (auth required).  
- **Community:** `POST /api/performances/by-lookup` with `targets: [{ actor, movie }]`.  
- **User’s ratings for actor:** `GET /api/actors/[id]/user-rating`.  
- **OG:** `GET /api/og?ratingId=...&size=...` or with `actorName`, `movieTitle`, `score`.

### Database dependencies

- **Rating:** Table `Rating` (userId, actorId, movieId, dimensions, weightedScore, shareScore, slug, etc.).  
- **Level/badges:** No DB; only `ratingCount` from `Rating` and hardcoded thresholds in code.  
- **Community average:** Computed from `Rating` (and possibly Performance) in by-lookup/aggregation logic.  
- **First rater:** `Rating` ordered by `createdAt` and/or hardcoded user IDs.

---

## 9. Implications for “Momentum Mode”

To support rapid consecutive ratings without breaking badges, progress, or community comparison:

1. **Keep:** Submission API, level-progress API, badge/level logic, community comparison formula, sessionStorage refresh for actor page, and the data that identifies “already rated” per actor.  
2. **Replace or relax:** Full-screen overlay. Options: small toast + “Rate next” that goes to next unrated performance (using existing `/api/actors/[id]/user-rating` + filmography list), or auto-redirect to actor `#filmography` with refresh, or inline success + “Rate next” button that uses a new or existing “next unrated” derivation.  
3. **Optional API:** Endpoint or helper that, given actorId (and optionally sort order), returns the “next” unrated performance for the current user to reduce client logic.  
4. **No change required:** Badge config, level math, or DB schema for a momentum-style flow; only UI and possibly one small API for “next” performance.
