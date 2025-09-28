## Performance Defaults

- Static home page with ISR (`src/app/page.tsx`) and lazy-loaded search.
- Aggressive API caching headers and Redis-backed query caching (`src/lib/cache.ts`).
- Prisma `select`-only responses on hot endpoints and reduced payloads.
- Bundle trimming via `modularizeImports` and fewer fonts.
- Tailwind v4 JIT already enabled; keep CSS minimal.

### Env for Redis (optional)

Add to `.env.local` to enable Redis caching:

```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

If not set, an in-memory cache is used.

# Actor Rating Platform

A minimalist, premium platform for rating actors' performances in specific movies using five Oscar-inspired criteria.

## Features

### 🎯 **Powerful Search Bar**

- **Live Search Suggestions**: Real-time autocomplete as you type
- **Multi-Entity Search**: Search by movie name, actor name, or character name
- **Clickable Results**: All search results are clickable and navigate directly to performance pages
- **Smart Categorization**: Results are organized by Performances, Actors, and Movies
- **Debounced Search**: Optimized performance with 300ms debouncing

### ⭐ **Performance Rating System**

- **5 Oscar-Inspired Criteria**:
  - **Technical Skill** (20% weight): Voice control, physical presence, technique mastery
  - **Emotional Depth** (25% weight): Range of emotions, authenticity, vulnerability
  - **Character Transformation** (25% weight): Physical/mental transformation, believability
  - **Story Impact** (15% weight): Essential to film's narrative and emotional impact
  - **Difficulty Factor** (15% weight): Challenge of role, accents, physicality, historical accuracy

- **Interactive Sliders**: Beautiful, responsive rating sliders with visual feedback
- **Real-time Score Calculation**: Weighted average score updates as you adjust ratings
- **Quality Zones**: Visual indicators (Poor, Fair, Good, Very Good, Excellent, Outstanding)
- **Draft Saving**: Auto-saves your progress as you rate

### 📝 **Enhanced Rating Pages**

- **Performance Detail Pages**: View existing ratings with detailed breakdowns
- **Integrated Rating Forms**: Rate performances directly from their detail pages
- **Success Confirmations**: Clear feedback when ratings are submitted
- **Anonymous Ratings**: Store ratings anonymously (user authentication ready)

### 🔍 **Smart Search & Navigation**

- **Global Search**: Search across all actors, movies, and performances
- **Performance-Focused Results**: Prioritize performance results in search
- **Quick Navigation**: Direct links to performance pages from search results
- **Responsive Design**: Works seamlessly on desktop and mobile

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd actor-rating
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Configure your database and Supabase Auth settings in `.env.local`:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/actor_rating_db"

   # Supabase Auth (required)
   NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
   SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

   # Optional: Redis caching
   UPSTASH_REDIS_REST_URL="your_redis_url"
   UPSTASH_REDIS_REST_TOKEN="your_redis_token"
   ```

4. **Set up Supabase Auth**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Authentication > Settings in your Supabase dashboard
   - Enable Google OAuth provider and configure with your Google OAuth credentials
   - Set the redirect URL to: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy your project URL and anon key to your `.env.local`

5. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Rating a Performance

1. **Search for a Performance**
   - Use the search bar on the homepage
   - Type an actor name, movie title, or character name
   - Click on a performance result to view details

2. **Rate the Performance**
   - Click "Rate Performance" on the performance detail page
   - Adjust the 5 sliders based on Oscar-inspired criteria
   - Add optional comments about the performance
   - Submit your rating

3. **View Results**
   - See your rating alongside others
   - View detailed breakdowns of all criteria
   - Compare different performances

### Search Features

- **Live Autocomplete**: Start typing to see instant suggestions
- **Categorized Results**: Results are organized by type (Actors, Movies)
- **Quick Navigation**: Click any result to go directly to that page
- **Smart Filtering**: Search across multiple fields simultaneously

## API Endpoints

### Search API (`/api/search`)

The search API provides powerful full-text search capabilities across movies, actors, and performances.

**Endpoint**: `GET /api/search?q=<search_term>`

**Parameters**:

- `q` (required): Search query (minimum 2 characters)

**Response Format**:

```json
{
  "movies": [{ "id": "string", "title": "string" }],
  "actors": [{ "id": "string", "name": "string" }]
}
```

**Features**:

- **Full-text Search**: Uses PostgreSQL `to_tsvector` and `plainto_tsquery` for natural language search
- **Trigram Similarity**: Falls back to `similarity()` function for fuzzy matching
- **Parameterized Queries**: Prevents SQL injection attacks
- **Result Limiting**: Maximum 10 results per category
- **Error Handling**: Returns 400 for invalid queries, 500 for server errors

**Example Usage**:

```bash
# Search for movies
curl "http://localhost:3000/api/search?q=Inception"

# Search for actors
curl "http://localhost:3000/api/search?q=Leonardo"
```

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth with SSR support
- **Deployment**: Vercel-ready
- **Search**: PostgreSQL full-text search with trigram similarity
- **Caching**: Redis (optional) with in-memory fallback

## Database Schema

The platform uses a relational database with the following key models:

- **Actor**: Actor information and metadata
- **Movie**: Movie details and metadata
- **Performance**: Individual performance ratings with 5 criteria
- **User**: User accounts and authentication
- **Rating**: Alternative rating model with weighted scores

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

## Share Pipeline (Feed/Story/OG)

This repo includes a production-ready share pipeline:

- API `POST /api/generate-share` generates images, uploads to S3, creates a shortlink, and returns URLs.
- Edge `GET /api/og?ratingId=<id_or_slug>&size=og|feed|story` renders a PNG for quick testing.
- Rating page `/r/[slug]` renders server-side with OG tags pointing to the generated OG image.
- Shortlink `/s/:code` redirects to rating page and logs clicks.

### Quick start

1. Copy env and run services:

```bash
cp env.example .env
docker-compose up -d
```

2. Migrate and seed demo data:

```bash
npx prisma migrate dev
npm run demo:seed
```

3. Run dev server:

```bash
npm run dev
```

4. Test OG endpoint and save image:

```bash
curl 'http://localhost:3000/api/og?ratingId=demo-123&size=og' > demo.png
```

5. Generate share assets for demo rating:

```bash
curl -X POST 'http://localhost:3000/api/generate-share' \
  -H 'Content-Type: application/json' \
  -d '{"ratingId": "demo-123"}'
```

### Endpoints

- POST `/api/generate-share` → returns `{ feedUrl, storyUrl, ogUrl, pageUrl, shortUrl }`
- GET `/api/og?ratingId=...&size=og|feed|story` → PNG with cache headers
- GET `/s/:code` → 302 redirect to rating page; logs click
- Page `/r/[slug]` → SSR page with OG meta

### Environment variables

- `DATABASE_URL`
- `NEXT_PUBLIC_BASE_URL`
- `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `SHORT_URL_DOMAIN` (optional; defaults to `NEXT_PUBLIC_BASE_URL`)
- `REDIS_URL` (optional)
- `USE_PUPPETEER` (optional fallback)
- `TMDB_API_KEY` (optional, not needed for share pipeline)

## Supabase Auth Deployment Notes

- Set Vercel envs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- In Supabase dashboard: enable Google provider and set Google client ID/secret.
- In Google Cloud Console: set Authorized redirect URI to the Supabase callback URL: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`.
- Redeploy.

### Storage

Default is AWS S3. Override `CDN_BASE_URL` to serve through CloudFront or another CDN. Keys are written under `share/{kind}/{slug}.png`.

### Tests and CI

Run tests locally:

```bash
npm test
```

GitHub Actions CI runs migrations, seeds demo, and tests on each push.

### Runbook (Vercel + S3/CloudFront)

- Deploy to Vercel; set env vars above.
- Create S3 bucket and CloudFront distribution; set `CDN_BASE_URL` to CloudFront domain.
- Ensure bucket policy allows public GET or use CloudFront OAI.
- Cache images long-lived; invalidate when regenerating.

### Notes on scaling

- Image endpoint sends `s-maxage` for CDN caching.
- Add queueing (BullMQ/Redis) around `generate-share` for heavy traffic.
- Apply rate limits per IP using `src/lib/rateLimit.ts`.

- Inspired by Oscar voting criteria
- Built with modern web technologies
- Designed for performance enthusiasts and critics

# Deployment trigger Tue Sep 23 06:58:13 +03 2025

# Trigger deployment Tue Sep 23 19:39:46 +03 2025
