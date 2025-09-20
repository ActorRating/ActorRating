import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchMovie, getMovieCredits } from "@/lib/tmdb";

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

    // 2. Get movie credits
    const credits = await getMovieCredits(movieData.id);
    
    // Extract year from release date
    const year = new Date(movieData.release_date).getFullYear();

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

    // 4. Create new movie
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
    let defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          email: 'default@example.com',
          password: 'default-password'
        }
      });
    }
    const userId = defaultUser.id;

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
      exists: false
    });

  } catch (error) {
    console.error("Error fetching movie:", error);
    return NextResponse.json(
      { error: "Failed to fetch movie" },
      { status: 500 }
    );
  }
} 