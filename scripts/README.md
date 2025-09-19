# Scripts

This directory contains utility scripts for the Actor Rating application.

## Export Data Script

The `export-data.ts` script exports all movies, actors, and performances from the database into JSON files.

### Usage

```bash
# From the actor-rating directory
npm run export:data

# Or directly with tsx
npx tsx scripts/export-data.ts
```

### View Export Summary

To quickly view the summary of the latest export without opening the large JSON file:

```bash
npm run export:summary
```

### What it exports

The script creates two JSON files in the `exports/` directory:

1. **Main export file**: `actor-rating-export-YYYY-MM-DD.json`

   - Contains all movies, actors, and performances
   - Includes summary statistics
   - Includes related data (user info, actor names, movie titles)

2. **Ratings export file**: `actor-rating-ratings-YYYY-MM-DD.json` (if ratings exist)
   - Contains only the ratings data
   - Useful for separate analysis of user ratings

### Export structure

```json
{
  "exportDate": "2024-01-15T10:30:00.000Z",
  "movies": [...],
  "actors": [...],
  "performances": [...],
  "summary": {
    "totalMovies": 150,
    "totalActors": 300,
    "totalPerformances": 500,
    "totalRatings": 200
  }
}
```

### Performance data includes

- All performance ratings (emotional range, character believability, etc.)
- User information (id, name, email)
- Actor information (id, name)
- Movie information (id, title, year)
- Timestamps (createdAt, updatedAt)

### Requirements

- Database connection (DATABASE_URL in .env)
- Prisma client
- Node.js with TypeScript support

### Output location

Files are saved to `actor-rating/exports/` directory, which is created automatically if it doesn't exist.
