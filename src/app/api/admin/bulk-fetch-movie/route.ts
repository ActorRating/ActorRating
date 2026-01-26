import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchMovie, getMovieCredits } from "@/lib/tmdb";
import { isJokePerformance } from "@/lib/joke-performance-filter";
import { validateContent } from "@/lib/content-validator";

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // 1. Search for movie using TMDB
    const movieData = await searchMovie(title);
    if (!movieData) {
      return NextResponse.json(
        { error: `Movie not found: ${title}` },
        { status: 404 }
      );
    }

    // 2. Get movie credits first (we need director for the filter)
    const credits = await getMovieCredits(movieData.id);
    
    // Extract year from release date
    const year = new Date(movieData.release_date).getFullYear();
    const currentYear = new Date().getFullYear();

    // Validate year - reject invalid or future years
    if (isNaN(year) || year < 1900 || year > currentYear) {
      return NextResponse.json(
        { 
          error: `Invalid movie year: ${year}. Movies must have a valid release year between 1900 and ${currentYear}.`,
          title: movieData.title,
          year: year
        },
        { status: 400 }
      );
    }

    // Check if this is a joke performance that should be excluded
    if (isJokePerformance(movieData.title, movieData.overview, year, credits.director)) {
      return NextResponse.json(
        { 
          error: `This appears to be a joke performance (TikTok, YouTube skit, meme, etc.) and will not be added. Only legitimate acting credits are accepted.`,
          title: movieData.title
        },
        { status: 400 }
      );
    }

    // 3. Check for existing movie
    const existingMovie = await prisma.movie.findFirst({
      where: {
        title: movieData.title,
        year: year,
      },
    });

    if (existingMovie) {
      return NextResponse.json(
        { 
          message: `Movie already exists: ${movieData.title} (${year})`,
          movie: existingMovie,
          exists: true
        },
        { status: 200 }
      );
    }

    // 4. Validate content (non-blocking warnings for admins)
    const contentWarnings = validateContent(movieData.title, movieData.overview);

    // 5. Create new movie
    const movie = await prisma.movie.create({
      data: {
        title: movieData.title,
        year: year,
        director: credits.director,
        tmdbId: movieData.id,
        overview: movieData.overview
      }
    });

    // 5. Create actors and performances
    const createdActors = [];
    const createdPerformances = [];

    // Get or create a default user for performances
    // NEW (Supabase-managed user id hardcoded from auth.users table)
    const DEFAULT_USER_ID = "uuid-from-auth-users"; // grab one from Supabase
    const userId = DEFAULT_USER_ID;

    for (const castMember of credits.cast) {
      // Check for existing actor
      let actor = await prisma.actor.findFirst({
        where: {
          name: castMember.name
        }
      });

      if (!actor) {
        actor = await prisma.actor.create({
          data: {
            name: castMember.name
          }
        });
        createdActors.push(actor);
      }

      // Check if performance already exists
      const existingPerformance = await prisma.performance.findFirst({
        where: {
          userId: userId,
          actorId: actor.id,
          movieId: movie.id,
        }
      });

      if (!existingPerformance) {
        // Create performance only if it doesn't exist
        const performance = await prisma.performance.create({
          data: {
            userId: userId,
            actorId: actor.id,
            movieId: movie.id,
            emotionalRangeDepth: 0,
            characterBelievability: 0,
            technicalSkill: 0,
            screenPresence: 0,
            chemistryInteraction: 0,
            comment: `Character: ${castMember.character}, Director: ${credits.director}`
          }
        });
        createdPerformances.push(performance);
      }
    }

    return NextResponse.json({
      message: `Successfully added movie: ${movie.title} (${movie.year})`,
      movie,
      actorsCreated: createdActors.length,
      performancesCreated: createdPerformances.length,
      exists: false,
      warnings: contentWarnings.length > 0 ? contentWarnings : undefined, // Only include if warnings exist
    });

  } catch (error) {
    console.error("Error fetching movie:", error);
    return NextResponse.json(
      { error: "Failed to fetch movie" },
      { status: 500 }
    );
  }
} 