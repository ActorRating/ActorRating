# Content Policy (Enforcement)

Before adding **any** new content (movie or actor), all of the following must pass. If any checkbox fails → **do not add**.

## Checklist

- [ ] **Movie has Wikipedia page (English)**  
  No Wikipedia (EN) → do not add.

- [ ] **Movie has 1,000+ IMDb votes**  
  Fewer votes → do not add (avoids obscure/adult titles).

- [ ] **Genre does NOT include "Adult," "Erotic," or "18+"**  
  If genre contains these → do not add.

- [ ] **Title does NOT contain sexual keywords**  
  No sex, voyeur, massage, erotic, seduction, temptation, etc. in title → do not add.

- [ ] **Actor has Wikipedia page OR 50+ notable film credits**  
  No Wikipedia and fewer than 50 notable credits → do not add.

- [ ] **Theatrical release OR major streaming platform**  
  Straight-to-video / adult-only platforms → do not add.

## Keywords (auto-exclude / manual review)

- **Auto-exclude (no add, remove if present):** sex, voyeur, massage, erotic (title); adult, erotic (genre). See `src/lib/adult-content-filter.ts` and `scripts/remove-adult-content.ts`.
- **Manual review (list and decide):** seduc, tempt, affair, obsess, desire, forbidden, passion, mistress. See `scripts/list-subtle-adult-movies.ts`. Review top 50; delete if not mainstream.

## Known adult performers (remove)

Do not add; remove if already in DB: Deborah Révy, Nao Saejima, Kaori Asô, Joo Ah, Kim Do-hee, Yoon Yool, Min Do-yoon. Use `scripts/remove-adult-performers.ts`.

## Scripts

| Script | Purpose |
|--------|--------|
| `npm run remove-adult-content` | Dry run: list movies matching explicit keywords |
| `npm run remove-adult-content:yes` | Delete those movies (cascade to performances/ratings) |
| `npx tsx scripts/list-subtle-adult-movies.ts` | List movies with subtle keywords for manual review |
| `npx tsx scripts/remove-adult-performers.ts` | Dry run: list known adult performers |
| `npx tsx scripts/remove-adult-performers.ts --yes` | Delete those actors (cascade) |
