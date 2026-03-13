import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actorId: string; movieId: string }> }
) {
  try {
    const { actorId, movieId } = await params
    console.log("Fetching performance for:", { actorId, movieId });

    // Find the performance with actor and movie details
    const performance = await prisma.performance.findFirst({
      where: {
        actorId: actorId,
        movieId: movieId,
        movie: { isFeaturette: false },
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        movie: {
          select: {
            id: true,
            title: true,
            year: true,
            director: true
          }
        }
      }
    });

    if (!performance) {
      return NextResponse.json(
        {
          error: "Performance not found",
          message: `No performance found for actor ${actorId} in movie ${movieId}`
        },
        { status: 404 }
      );
    }

    // Format the response to match what your component expects
    const response = {
      id: performance.id,
      actor: {
        id: performance.actor.id,
        name: performance.actor.name,
        imageUrl: performance.actor.imageUrl
      },
      movie: {
        id: performance.movie.id,
        title: performance.movie.title,
        year: performance.movie.year,
        director: performance.movie.director
      },
      emotionalRangeDepth: 0,
      characterBelievability: 0,
      technicalSkill: 0,
      screenPresence: 0,
      chemistryInteraction: 0,
      comment: "",
      user: {
        name: "User",
        email: "user@example.com"
      },
      createdAt: performance.createdAt.toISOString(),
      updatedAt: performance.updatedAt.toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching performance:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch performance",
        debug: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}