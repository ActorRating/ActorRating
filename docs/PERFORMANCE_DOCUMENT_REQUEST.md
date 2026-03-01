# Document Request Latency (Lighthouse)

Lighthouse may report:

- **Document request latency** — “Est savings of ~3,500 ms”
- **Server responded slowly** — e.g. observed 3,575 ms
- **Avoid redirects** — reduce round trips for the first request
- **Apply text compression** — gzip/brotli for HTML/JS/CSS

## Why the first request can be slow

### 1. Server response time (~3.5 s)

**Cause:** On serverless (e.g. Vercel), the **first request** after idle often hits a **cold start**: the runtime has to start the function and your app before sending the HTML. That alone can be 2–4 seconds.

**What we do in the app:**

- The **landing page (`/`)** does **not** run middleware (matcher excludes `/`).
- The **root layout** does **not** do any blocking data fetches.
- The **home page** is a Server Component that only renders layout + client shell; no server-side API/DB calls for the document.

So the delay is almost always **cold start**, not slow code on our side.

**What you can do:**

- **Vercel:** Use the same region as most users; consider Pro/Enterprise for better cold-start behaviour.
- **Keep the app warm:** Use a cron (e.g. Vercel Cron or external) to hit `https://yoursite.com` every few minutes so the first real user request is often warm.
- **Run Lighthouse on a warm load:** After 1–2 manual loads, run the audit again; you should see much lower TTFB.

### 2. Redirects

**Cause:** If the **first** document request is redirected (e.g. `http` → `https`, or `example.com` → `www.example.com`), the browser does two round trips and TTFB goes up.

**What you can do:**

- **Use one canonical host:** Choose either `https://www.actorrating.com` or `https://actorrating.com` and redirect the other at the **host level** (e.g. Vercel “Redirects” or DNS).
- **Run Lighthouse on the final URL:** Open the canonical URL in the browser, then run Lighthouse so the document request is **not** the one that gets redirected.
- **Our app:** We do **not** redirect on `/` in middleware; the matcher only runs for `/actors/*`, `/movies/*`, `/dashboard/*`, `/auth/signin`, `/auth/signup`.

### 3. Text compression

**Cause:** If the HTML (or JS/CSS) response is not compressed, transfer size and sometimes perceived latency increase.

**What we have:**

- **Vercel:** Responses are compressed (gzip/brotli) by the platform; no app change needed.
- **Next.js `next start`:** Compression is on by default.
- **Standalone (`node server.js`):** The minimal Node server may not compress. Put **nginx** (or another reverse proxy) in front and enable `gzip` (and optionally `brotli`) for `text/html`, `application/javascript`, `text/css`.

So for **Vercel** and **`next start`**, compression is already applied; the main lever is **cold start** and **redirects**.

## Summary

| Finding              | Likely cause              | Action |
|----------------------|---------------------------|--------|
| Server responded slowly | Serverless cold start     | Warm the app; run Lighthouse after a warm load; consider Vercel plan/region. |
| Avoid redirects      | First request goes to a URL that redirects | Use canonical URL in tests; configure one canonical host and redirect the other at host. |
| Text compression     | Usually already on (Vercel / `next start`) | If self-hosting standalone, enable gzip (and brotli) in the reverse proxy. |

Fixing cold start and avoiding a redirect on the document request will remove most of the “Est savings” Lighthouse reports for the landing page.
