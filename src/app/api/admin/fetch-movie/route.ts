export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchMovie, getMovieCreditsForIngestion } from "@/lib/tmdb";
import { isJokePerformance } from "@/lib/joke-performance-filter";
import { validateContent } from "@/lib/content-validator";
import { SYSTEM_USER_ID, syncMovieCast } from "@/lib/movie-ingestion";

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // 1. Search for movie using TMDB
    const movieData = await searchMovie(title);
    if (!movieData) {
      return NextResponse.json({ error: `Movie not found: ${title}` }, { status: 404 });
    }

    // 2. Fetch full cast (rate-limited). One request per movie; director for joke check.
    const credits = await getMovieCreditsForIngestion(movieData.id);

    if (credits.cast.length === 0) {
      console.warn(`fetch-movie: TMDB returned no credited cast for "${movieData.title}" (${movieData.id}); skipping ingestion`);
      return NextResponse.json(
        { error: "TMDB returned no credited cast for this movie; skipping ingestion.", title: movieData.title },
        { status: 400 }
      );
    }

    const year = new Date(movieData.release_date).getFullYear();
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1900 || year > currentYear) {
      return NextResponse.json(
        {
          error: `Invalid movie year: ${year}. Movies must have a valid release year between 1900 and ${currentYear}.`,
          title: movieData.title,
          year,
        },
        { status: 400 }
      );
    }

    if (isJokePerformance(movieData.title, movieData.overview, year, credits.director)) {
      return NextResponse.json(
        {
          error: `This appears to be a joke performance (TikTok, YouTube skit, meme, etc.) and will not be added. Only legitimate acting credits are accepted.`,
          title: movieData.title,
        },
        { status: 400 }
      );
    }

    const contentWarnings = validateContent(movieData.title, movieData.overview);

    // 3. Find or create movie. Re-runs: movie exists → we still sync cast (idempotent).
    let movie = await prisma.movie.findFirst({
      where: { title: movieData.title, year },
    });
    const movieExisted = !!movie;

    if (!movie) {
      movie = await prisma.movie.create({
        data: {
          title: movieData.title,
          year,
          director: credits.director,
          tmdbId: movieData.id,
          overview: movieData.overview,
        },
      });
    } else if (movie.tmdbId === null) {
      movie = await prisma.movie.update({
        where: { id: movie.id },
        data: { tmdbId: movieData.id, director: credits.director },
      });
    }

    // 4. Sync full cast: ensure actors by tmdbId, upsert performances (order + tier). Idempotent.
    const { actorsCreated, performancesUpserted } = await syncMovieCast(
      prisma,
      movie.id,
      SYSTEM_USER_ID,
      credits,
      { director: credits.director }
    );

    return NextResponse.json({
      message: movieExisted
        ? `Movie synced: ${movie.title} (${movie.year})`
        : `Successfully added movie: ${movie.title} (${movie.year})`,
      movie,
      actorsCreated,
      performancesUpserted,
      exists: movieExisted,
      warnings: contentWarnings.length > 0 ? contentWarnings : undefined,
    });
  } catch (error) {
    console.error("Error fetching movie:", error);
    return NextResponse.json({ error: "Failed to fetch movie" }, { status: 500 });
  }
} 