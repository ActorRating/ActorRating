export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addMovieFromTitle } from "@/lib/admin/addMovieFromTitle"

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json()
    const result = await addMovieFromTitle(prisma, typeof title === "string" ? title : "")

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, title: result.title, year: result.year },
        { status: result.status },
      )
    }

    return NextResponse.json({
      message: result.message,
      movie: result.movie,
      actorsCreated: result.actorsCreated,
      performancesUpserted: result.performancesUpserted,
      filmographyActorsExpanded: result.filmographyActorsExpanded,
      filmographyPerformancesAdded: result.filmographyPerformancesAdded,
      filmographyMovieShellsCreated: result.filmographyMovieShellsCreated,
      exists: result.exists,
      warnings: result.warnings,
    })
  } catch (error) {
    console.error("Error fetching movie:", error)
    return NextResponse.json({ error: "Failed to fetch movie" }, { status: 500 })
  }
}
